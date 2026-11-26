/* ═══════════════════════════════════
   TECHNIK-ABZEICHEN – echte Off-Screen-Challenges, ELTERN haken ab.
   Schafft das Kind eine Übung zuhause/beim Spielen → Eltern bestätigen → Federn (einmalig
   pro Abzeichen via quelle_id). Erledigte kommen aus xp_events_for (append-only punkte_log).
   IDs sind STABIL (nie umbenennen → sonst Doppel-Gutschrift). Vertrauens-Modell ok: kein
   Ranking, Federn speisen nur die eigene Karte – „Schummeln" bringt niemandem etwas.
═══════════════════════════════════ */
/*ABZEICHEN-TEXTE-ANFANG*/
/* v962 · Charles 24.11.: „Die ganze Akademie auch in Kindersprache. Und einfach und gut zu lesen.“ – kurze Sätze, „-mal“ statt „×“,
   Bronze bekommt wie Silber Schritte und einen Tipp. Zwischen den Marken liest auch tools/quiz-audio-namen.js (Lennart, audio/schule/). */
const TECHNIK_ABZEICHEN=[
  {id:"ab_jonglier",emo:"🤹",name:"Ball-Jongleur",desc:"Halte den Ball 5-mal hoch. Er darf nicht runterfallen.",schritte:["Lass den Ball auf deinen Fuß fallen.","Tipp ihn wieder nach oben.","Schaffst du das 5-mal hintereinander?"],tipp:"Fang mit einem Mal an. Dann zwei. Dann drei."},
  {id:"ab_beidfuss",emo:"🦶",name:"Beidfüßer",desc:"Schieß 10-mal mit rechts und 10-mal mit links gegen eine Wand.",schritte:["Stell dich vor eine Wand.","Schieß 10-mal mit dem rechten Fuß.","Dann 10-mal mit dem linken Fuß."],tipp:"Der schwache Fuß wird stark, wenn du ihn oft benutzt."},
  {id:"ab_slalom",emo:"🐍",name:"Slalom-König",desc:"Dribble durch 5 Hütchen. Keins darf umfallen.",schritte:["Stell 5 Hütchen oder Schuhe in eine Reihe.","Dribble im Zickzack hindurch.","Kein Hütchen ist umgefallen? Geschafft!"],tipp:"Langsam ist erlaubt. Der Ball bleibt nah am Fuß."},
  {id:"ab_innenseite",emo:"🎯",name:"Pass-Meister",desc:"Triff die Wand 10-mal mit der Innenseite. Aus 3 großen Schritten.",schritte:["Geh 3 große Schritte von der Wand weg.","Pass mit der Innenseite gegen die Wand.","Zähl laut mit bis 10."],tipp:"Dein Fuß zeigt zur Seite – wie ein Golfschläger."},
  {id:"ab_sohle",emo:"↩️",name:"Sohlen-Roller",desc:"Roll den Ball 10-mal mit der Sohle vor und zurück.",schritte:["Stell deine Sohle oben auf den Ball.","Roll ihn nach vorn und wieder zurück.","10-mal – dann ist es geschafft."],tipp:"Mach nur ganz kleine Bewegungen."},
  {id:"ab_torschuss",emo:"⚽",name:"Torjäger",desc:"Triff 5-mal ins Tor. Aus 5 großen Schritten.",schritte:["Bau ein kleines Tor, zum Beispiel aus zwei Schuhen.","Geh 5 große Schritte weg.","Schieß! 5 Treffer brauchst du."],tipp:"Schau erst aufs Tor, dann auf den Ball."},
  /* v961 · Charles 24.11.: „Aber keine Kopfball mehr.“ Die Kennung bleibt (Federn sind vergeben), das Abzeichen steht nirgends mehr. */
  {id:"ab_kopfball",emo:"🧠",name:"Kopfball-Held",desc:"Köpfe einen weichen Ball 3× ganz sanft.",alt:true},
  {id:"ab_ausdauer",emo:"🏃",name:"Ausdauer-Adler",desc:"Spiel oder lauf 10 Minuten ohne Pause.",schritte:["Mama oder Papa stellt einen Wecker auf 10 Minuten.","Spiel oder lauf, bis er klingelt.","Bleib nicht stehen!"],tipp:"Lieber langsam laufen als stehen bleiben."},
  {id:"ab_trick",emo:"✨",name:"Trick-Meister",desc:"Mach einen Übersteiger. 3-mal hintereinander.",schritte:["Lauf langsam mit dem Ball.","Schwing dein Bein über den Ball. Berühr ihn dabei nicht.","Lauf mit dem anderen Fuß weiter. Schaffst du das 3-mal hintereinander?"],tipp:"Übe es erst im Stehen. Dann im Laufen."},
  {id:"ab_stoppen",emo:"🛑",name:"Ball-Stopper",desc:"Jemand wirft dir den Ball zu. Stopp ihn 5-mal.",schritte:["Mama oder Papa wirft dir den Ball zu.","Stopp ihn mit dem Fuß. Er soll liegen bleiben.","5-mal geschafft? Super!"],tipp:"Zieh den Fuß ein kleines Stück zurück, wenn der Ball kommt."}
];
/* ═══ v961 · Adler-Akademie, Praxis (Charles 24.11.2026, Bild freigegeben): „Dann brauchen wir auch eine nächste Stufe der aktuellen
   Technik-Abzeichen. Weitere Übungen für die Kinder zu Hause … Aber keine Kopfball mehr.“ Silber öffnet ab 8 von 9 Bronze; wer das
   Kopfball-Abzeichen schon hat, dem zählt es mit („Wer die ersten Skill-Abzeichen schon hat, geht direkt auf Silber“). Silber-Federn
   kommen aus der eigenen Quelle „abzeichen_silber“ (20 statt 10, Migration v961). IDs STABIL, wie oben. */
const TECHNIK_SILBER=[
  {id:"ab2_jonglier",emo:"🤹",name:"Jongleur-Profi",desc:"Halte den Ball 10-mal hoch. Er darf nicht aufkommen.",schritte:["Lass den Ball aus der Hand auf deinen Fuß fallen.","Spiel ihn mit dem Fuß oder dem Oberschenkel wieder hoch.","Zähl laut mit. Bei 10 hast du es geschafft."],tipp:"Zieh die Fußspitze ein bisschen hoch. Dann springt der Ball gerade nach oben."},
  {id:"ab2_doppelpass",emo:"🔄",name:"Wand-Doppelpass",desc:"20 Pässe gegen die Wand. Immer abwechselnd rechts und links.",schritte:["Stell dich 3 Schritte vor eine Wand.","Pass mit rechts. Nimm den Ball mit links an.","Dann andersherum. 20 Pässe ohne Fehler."],tipp:"Spiel den Ball flach. Mit der Innenseite."},
  {id:"ab2_slalom",emo:"⏱️",name:"Slalom-Sprint",desc:"Dribble durch 6 Hütchen hin und zurück. In weniger als 20 Sekunden.",schritte:["Stell 6 Hütchen oder Schuhe in eine Reihe. Immer 2 große Schritte Abstand.","Dribble hin und zurück durch alle hindurch.","Mama oder Papa stoppt die Zeit."],tipp:"Mach kleine Schritte. Der Ball bleibt nah am Fuß."},
  {id:"ab2_zielpass",emo:"🎯",name:"Ziel-Pass",desc:"Spiel 10 Pässe durch ein kleines Tor. 7 müssen durchgehen.",schritte:["Leg zwei Schuhe einen großen Schritt auseinander. Das ist dein Tor.","Geh 5 große Schritte weg.","Spiel 10 Pässe. 7 müssen durchgehen."],tipp:"Dein Standbein steht neben dem Ball. Du schaust aufs Ziel."},
  {id:"ab2_schwach",emo:"🦶",name:"Schwacher Fuß",desc:"Schieß 3 Tore mit deinem schwächeren Fuß.",schritte:["Nimm den Fuß, mit dem du sonst nicht schießt.","Schieß aus 5 großen Schritten aufs Tor.","3 Treffer – fertig!"],tipp:"Erst genau schießen. Dann fest."},
  {id:"ab2_cruyff",emo:"🌀",name:"Cruyff-Drehung",desc:"Dreh dich 5-mal mit dem Ball um und lauf weiter.",schritte:["Lauf mit dem Ball los. Tu so, als ob du schießt.","Zieh den Ball mit der Innenseite hinter deinem Standbein vorbei.","Dreh dich mit und lauf in die andere Richtung weiter."],tipp:"Übe es erst langsam. Dann wirst du schneller."},
  {id:"ab2_luftstopp",emo:"🛑",name:"Luft-Stopper",desc:"Wirf den Ball hoch und stopp ihn 5-mal in einem Kreis.",schritte:["Mach einen Kreis, so groß wie ein großer Schritt.","Wirf den Ball hoch. Stopp ihn mit dem Fuß oder dem Oberschenkel.","Er bleibt im Kreis liegen? Schaffst du das 5-mal?"],tipp:"Nimm den Ball ganz weich an. Wie mit einem Kissen."},
  {id:"ab2_sohlenkreis",emo:"↩️",name:"Sohlen-Kreis",desc:"Roll den Ball mit der Sohle einmal um dich herum. Mit beiden Füßen.",schritte:["Stell deine Sohle auf den Ball.","Zieh ihn mit kleinen Schritten einmal rund um dich herum.","Dann mit dem anderen Fuß in die andere Richtung."],tipp:"Kleine Stupser. Der Ball bleibt dicht bei dir."},
  {id:"ab2_abschirmen",emo:"🛡️",name:"Ball behalten",desc:"Behalte den Ball 30 Sekunden. Mama oder Papa will ihn haben.",schritte:["Mama oder Papa versucht, an den Ball zu kommen. Ohne zu schubsen.","Stell deinen Körper zwischen den Ball und Mama oder Papa.","Behalte den Ball 30 Sekunden lang."],tipp:"Mach die Arme ein bisschen breit. Der Ball bleibt weit weg vom anderen."},
  {id:"ab2_tennis",emo:"🎾",name:"Fußball-Tennis",desc:"Spielt euch den Ball 10-mal über eine Linie zu. Nur mit dem Fuß.",schritte:["Legt eine Linie zwischen euch. Zum Beispiel ein Seil oder Schuhe.","Spielt euch den Ball über die Linie zu. Er darf einmal aufkommen.","Schafft ihr 10-mal hin und her?"],tipp:"Nur mit dem Fuß und dem Oberschenkel. Nicht mit dem Kopf."}
];
/* Was Lennart zu einem Abzeichen sagt (dieselbe Funktion nutzt tools/quiz-audio-namen.js für die Dateinamen). */
function abzeichenSprechtext(a){ return [a.name+".",...(a.schritte||[a.desc]),a.tipp?("Mein Tipp: "+a.tipp):""].filter(Boolean).join(" "); }
/*ABZEICHEN-TEXTE-ENDE*/
const ABZ_SILBER_AB=8;
const ABZ_STUFEN=[
  {key:"bronze",emo:"🥉",name:"Bronze",quelle:"abzeichen",liste:()=>TECHNIK_ABZEICHEN.filter(a=>!a.alt)},
  {key:"silber",emo:"🥈",name:"Silber",quelle:"abzeichen_silber",liste:()=>TECHNIK_SILBER}
];
function abzeichenFinden(id){ return TECHNIK_ABZEICHEN.concat(TECHNIK_SILBER).find(a=>a.id===id)||null; }
let _abzStand={};   // spielerId → {bronze:Set, silber:Set}
async function abzeichenStandLaden(spielerId){
  const hol=async q=>{ try{ const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_events_for`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:q})}); return r.ok?((await r.json())||[]):[]; }catch(e){ return []; } };
  /* v962: dazu die offenen „Ich hab's geschafft!“-Meldungen (abzeichen_meldung); fehlt die Tabelle, bleibt die Menge leer */
  const gem=async()=>{ try{ const r=await fetch(`${SB_URL}/rest/v1/abzeichen_meldung?spieler_id=eq.${Number(spielerId)}&select=abzeichen`,{headers:sbAuthHeaders()}); return r.ok?((await r.json())||[]).map(x=>x.abzeichen):[]; }catch(e){ return []; } };
  const [b,s,g]=await Promise.all([hol("abzeichen"),hol("abzeichen_silber"),gem(),(typeof skillMonatLaden==="function"?skillMonatLaden():null)]);
  _abzStand[spielerId]={bronze:new Set(b.map(String)),silber:new Set(s.map(String)),gemeldet:new Set(g.map(String))};
  return _abzStand[spielerId];
}
/* Bronze-Zähler: die neun Abzeichen, dazu ein schon verdientes Kopfball-Abzeichen (höchstens 9). */
function abzeichenBronzeZahl(st){ const n=TECHNIK_ABZEICHEN.filter(a=>!a.alt&&st.bronze.has(a.id)).length+(TECHNIK_ABZEICHEN.some(a=>a.alt&&st.bronze.has(a.id))?1:0); return Math.min(9,n); }
async function abzeichenOpen(spielerId,name,kidsMode){
  document.getElementById("abzeichen-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="abzeichen-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Trainingsplatz – Technik-Abzeichen");
  modal.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:${kidsMode?10060:10001};display:flex;flex-direction:column;padding:14px;overflow-y:auto`;
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("abzeichen-modal","⚽",`Trainingsplatz${name?" · "+esc(name):""}`,"Technik-Abzeichen der Adler-Akademie","#6d28d9")}
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:12px">${kidsMode?`Üb zu Hause mit dem Ball. Geschafft? Zeig es Mama oder Papa. Sie haken es ab – dann gibt es Adler-Federn ${XP_ICON}.`:`Schafft dein Kind eine Übung, trag sie ein – es gibt Adler-Federn ${XP_ICON} (Bronze 10, Silber 20).`}</div>
    <div id="abzeichen-list" data-spieler="${Number(spielerId)}" data-kids="${kidsMode?1:0}"><div style="color:var(--text3);font-size:var(--s-text)">Lade…</div></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('abzeichen-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  abzeichenRender(spielerId,kidsMode);
}
/* Der Trainingsplatz als HTML – im Fenster und in der Akademie (quiz.js) derselbe. */
function abzeichenPlatzHtml(spielerId,kidsMode){
  const st=_abzStand[spielerId]||{bronze:new Set(),silber:new Set(),gemeldet:new Set()};
  const gem=st.gemeldet||new Set();
  const bronze=abzeichenBronzeZahl(st), offenSilber=bronze>=ABZ_SILBER_AB;
  const zeile=(a,stufe,an)=>`<div class="abz-zeile${an?" abz-an":""}">
      <button type="button" class="abz-info" onclick="abzeichenDetail('${a.id}',${Number(spielerId)},${kidsMode?1:0})" aria-label="${esc(a.name)} – so geht's">
        <span class="abz-emo" aria-hidden="true">${a.emo}</span>
        <span class="abz-txt"><b>${esc(a.name)}${an?" ✓":""}${!an&&!kidsMode&&gem.has(a.id)?` <span class="abz-gemeldet">🙋 gemeldet</span>`:""}</b><small>${esc(a.desc)}</small></span></button>
      ${an?`<span class="abz-ok">✓ geschafft</span>`:(kidsMode?(gem.has(a.id)?`<span class="abz-wartet">⏳ wartet</span>`:`<span class="abz-offen">offen</span>`):`<button class="btn btn-sm" onclick="abzeichenAward(${Number(spielerId)},'${a.id}',this,'${stufe.quelle}')" data-el-fest="1" style="flex:none;white-space:nowrap;justify-content:center">Geschafft</button>`)}
    </div>`;
  const teil=(stufe,zu)=>{ const l=stufe.liste(), n=stufe.key==="bronze"?bronze:l.filter(a=>st.silber.has(a.id)).length;
    return `<section class="abz-stufe${zu?" abz-zu":""}" aria-label="${stufe.name}">
      <h3 class="abz-stufe-k"><span>${stufe.emo} ${stufe.name}</span><span class="abz-zahl">${zu?"🔒":`${n}/${l.length}`}</span></h3>
      ${zu?`<div class="abz-hinweis">Noch ${ABZ_SILBER_AB-bronze} Bronze-Abzeichen, dann geht Silber auf.</div>`
         :l.map(a=>zeile(a,stufe,stufe.key==="bronze"?st.bronze.has(a.id):st.silber.has(a.id))).join("")}
    </section>`; };
  return teil(ABZ_STUFEN[0],false)+teil(ABZ_STUFEN[1],!offenSilber)
    +`<section class="abz-stufe abz-zu" aria-label="Gold"><h3 class="abz-stufe-k"><span>🥇 Gold</span><span class="abz-zahl">bald</span></h3></section>`;
}
async function abzeichenRender(spielerId,kidsMode){
  const box=document.getElementById("abzeichen-list"); if(!box)return;
  if(kidsMode===undefined)kidsMode=box.dataset.kids==="1";
  await abzeichenStandLaden(spielerId);
  box.innerHTML=abzeichenPlatzHtml(spielerId,kidsMode);
  if(typeof akademiePraxisNeu==="function")akademiePraxisNeu();
}
/* Ein Abzeichen antippen: So geht's, Tipp, Vorlesen – Kinder sehen dasselbe ohne Abhaken. */
function abzeichenDetail(id,spielerId,kidsMode){
  const a=abzeichenFinden(id); if(!a)return;
  const silber=TECHNIK_SILBER.includes(a);
  const st=_abzStand[spielerId]||{bronze:new Set(),silber:new Set(),gemeldet:new Set()}, an=(silber?st.silber:st.bronze).has(a.id);
  const gemeldet=!!(st.gemeldet&&st.gemeldet.has(a.id)), skill=skillAbzAktiv(a.id);
  const {karte}=fensterAuf("abz-detail",{mitte:true,breite:420,aussen:true});
  const schritte=a.schritte||[a.desc];
  const text=abzeichenSprechtext(a);
  karte.innerHTML=`${mdlHead("abz-detail",a.emo,esc(a.name),(silber?"🥈 Silber":"🥉 Bronze")+" · zu Hause oder im Garten","#6d28d9")}
    <ol class="abz-schritte">${schritte.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>
    ${a.tipp?`<div class="abz-tipp">💡 <b>Mein Tipp:</b> ${esc(a.tipp)}</div>`:""}
    <button type="button" class="btn abz-vorlesen" onclick="abzeichenVorlesen(this)" data-text="${esc(text)}" style="width:100%;min-height:48px;margin-top:10px;justify-content:center"><span class="abz-ton" aria-hidden="true">🔊</span> Vorlesen</button>
    ${/* v962 · Charles 24.11.: Kinder melden selbst „geschafft“, die Eltern geben es oben in ihrer App frei */""}
    ${/* v980 · Charles 26.11.: Den Skill des Monats nimmt ein Trainer beim Training ab – nicht die Eltern. */""}
    ${an?`<div class="abz-fertig">✓ Schon geschafft – stark!</div>`
      :kidsMode?(gemeldet?`<div class="abz-fertig">${skill?"⏳ Zeig es deinem Trainer beim nächsten Training.":"⏳ Du hast es gemeldet. Mama oder Papa schauen es sich an."}</div>`
        :`<button type="button" class="btn btn-p abz-melden" onclick="abzeichenMelden('${a.id}',${Number(spielerId)},this)" style="width:100%;min-height:56px;margin-top:10px;justify-content:center">${skill?"🙋 Ich kann's – beim Training zeigen":"🙋 Ich hab's geschafft!"}</button>
          <div class="abz-fertig" style="font-weight:400">${skill?"Dann weiß dein Trainer Bescheid und schaut beim Training zu.":"Dann bekommen Mama oder Papa Bescheid."}</div>`)
      :(!Number(spielerId)?"":gemeldet?`<div class="abz-fertig">🙋 ${skill?"Euer Kind möchte es beim nächsten Training zeigen.":"Dein Kind hat es als geschafft gemeldet."}</div>`:"")}
    ${(skill&&!an&&!kidsMode&&!skillAbnahmeDarf())?`<div class="abz-fertig" style="font-weight:400">⭐ Skill des Monats: Abgenommen wird beim Training von einem Trainer.</div>`:""}
    ${(!an&&!kidsMode&&Number(spielerId)&&(!skill||skillAbnahmeDarf()))?`<button type="button" class="btn btn-p" onclick="document.getElementById('abz-detail')?.remove();abzeichenAward(${Number(spielerId)},'${a.id}',null,'${silber?"abzeichen_silber":"abzeichen"}')" style="width:100%;min-height:56px;margin-top:10px;justify-content:center"><i class="ti ti-check"></i>Als geschafft eintragen</button>`:""}`;
}
/* v962: Lennart liest vor (audio/schule/<hash>.mp3 über kfVorlesen aus quiz.js); fehlt die Aufnahme oder quiz.js, die Gerätestimme. */
function abzeichenVorlesen(k){
  const text=k.dataset.text||"", ton=k.querySelector(".abz-ton");
  if(typeof kfVorlesen==="function"){ kfVorlesen([text],ton,()=>text); return; }
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang="de-DE"; u.rate=.95; speechSynthesis.speak(u); }catch(e){}
}
/* v962: Das nächste offene Abzeichen – für „Als Nächstes“ in der Akademie: erst Bronze, dann (wenn offen) Silber; gemeldete überspringen. */
function abzeichenNaechstes(st){
  if(!st)return null;
  const g=st.gemeldet||new Set();
  const b=TECHNIK_ABZEICHEN.find(a=>!a.alt&&!st.bronze.has(a.id)&&!g.has(a.id)); if(b)return b;
  if(abzeichenBronzeZahl(st)>=ABZ_SILBER_AB)return TECHNIK_SILBER.find(a=>!st.silber.has(a.id)&&!g.has(a.id))||null;
  return null;
}
/* v962: Das Kind meldet „Ich hab's geschafft!“ – eine Zeile in abzeichen_meldung; die Eltern sehen sie oben in ihrer App. */
async function abzeichenMelden(id,spielerId,btn){
  const a=abzeichenFinden(id); if(!a)return;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/abzeichen_meldung`,{method:"POST",headers:sbAuthHeaders({Prefer:"return=minimal"}),
      body:JSON.stringify({spieler_id:Number(spielerId),abzeichen:a.id,quelle:TECHNIK_SILBER.includes(a)?"abzeichen_silber":"abzeichen"})});
    if(!r.ok&&r.status!==409)throw new Error("HTTP "+r.status);
    const st=_abzStand[spielerId]; if(st){ st.gemeldet=st.gemeldet||new Set(); st.gemeldet.add(a.id); }
    document.getElementById("abz-detail")?.remove();
    toast(skillAbzAktiv(a.id)?"Super! 🎉 Zeig es deinem Trainer beim nächsten Training.":"Super! 🎉 Mama oder Papa bekommen Bescheid.");
    if(document.getElementById("abzeichen-list"))abzeichenRender(spielerId);
    else if(typeof akademiePraxisLaden==="function")akademiePraxisLaden();
  }catch(e){ toast("Das hat nicht geklappt. Probier es gleich noch mal.","err"); if(btn)btn.disabled=false; }
}
/* v962: Meldung erledigen (nach „Ja, geschafft“ oder „Noch nicht“) – nur Eltern und Trainer dürfen löschen. */
async function abzeichenMeldungWeg(spielerId,id){
  try{ await fetch(`${SB_URL}/rest/v1/abzeichen_meldung?spieler_id=eq.${Number(spielerId)}&abzeichen=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:sbAuthHeaders({Prefer:"return=minimal"})}); }catch(e){}
  const st=_abzStand[spielerId]; if(st&&st.gemeldet)st.gemeldet.delete(id);
}
/* ═══ v963 · Skill des Monats (Charles 24.11., freigegeben): oben auf dem Trainingsplatz, mit Video (YouTube erst nach Tipp über
   youtube-nocookie, oder eigener Clip unter video/), verknüpft mit einem Abzeichen. Daten: skill_woche (aktiv, titel, beschreibung,
   video_url, abzeichen). Hier liegt alles, was Akademie, Kabine, Eltern und Trainingsplanung gemeinsam brauchen. ═══ */
let _skillMonat;   // undefined = noch nicht geladen, null = keiner aktiv
/* v980: Gehört das Abzeichen zum aktiven Skill des Monats? Dann nimmt ihn ein Trainer beim Training ab. */
function skillAbzAktiv(id){ return !!(_skillMonat&&_skillMonat.abzeichen&&_skillMonat.abzeichen===id); }
function skillAbnahmeDarf(){ return /\/trainer\//.test(location.pathname); }
async function skillMonatLaden(neu){
  if(_skillMonat!==undefined&&!neu)return _skillMonat;
  try{ const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()}); _skillMonat=r.ok?((await r.json())[0]||null):null; }
  catch(e){ _skillMonat=null; }
  return _skillMonat;
}
function skillVideoArt(url){
  url=String(url||"");
  const yt=url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if(yt)return {art:"youtube",src:`https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1`};
  if(/^video\/[A-Za-z0-9._-]+\.mp4$/.test(url))return {art:"clip",src:url};
  return null;
}
/* v963 · Charles 24.11.: „Ist es auch möglich, das Video komplett embedded zu haben, so dass ich das direkt sehe und nur noch auf die
   Play-Taste drücken muss?“ – freigegeben: eine Player-Fläche im 16:9-Format mit großem ▶; ein Tipp lädt YouTube und startet sofort
   (autoplay). Vorher geht nichts an Google (wie v645 in der Kabine). Eigene Clips stehen direkt als Video mit Steuerung da. */
function skillVideoHtml(sk,id){
  const v=sk&&skillVideoArt(sk.video_url); if(!v)return "";
  const basis=(typeof kfBasis==="function")?kfBasis():"";
  if(v.art==="clip")return `<div class="skm-video" id="${esc(id)}"><video src="${esc(basis+v.src)}#t=0.1" controls playsinline preload="metadata" class="skm-frame" aria-label="${esc("Video: "+(sk.titel||"Skill des Monats"))}"></video>
    <div class="skm-quelle">Ein Video von deinen Trainern.</div></div>`;
  return `<div class="skm-video" id="${esc(id)}" data-src="${esc(v.src)}" data-titel="${esc("Video: "+(sk.titel||"Skill des Monats"))}">
    <button type="button" class="skm-player" onclick="skillVideoLaden('${esc(id)}')" aria-label="${esc("Video abspielen: "+(sk.titel||""))}">
      <span class="skm-player-play" aria-hidden="true">▶</span><span class="skm-player-titel">${esc(sk.titel||"")}</span></button>
    <div class="skm-quelle">Das Video kommt von YouTube und startet beim Tippen.</div></div>`;
}
function skillVideoLaden(id){
  const h=document.getElementById(id); if(!h||!h.dataset.src)return;
  const f=document.createElement("iframe"); f.title=h.dataset.titel||""; f.src=h.dataset.src+"&autoplay=1"; f.className="skm-frame";
  f.setAttribute("allow","autoplay; encrypted-media; picture-in-picture; fullscreen"); f.setAttribute("allowfullscreen",""); f.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
  h.replaceChildren(f);
}
/* Die Karte oben auf dem Trainingsplatz (Kinder) – mit Video und dem verknüpften Abzeichen. */
function skillMonatKarteHtml(sk,spielerId,kidsMode){
  if(!sk)return "";
  const a=sk.abzeichen?abzeichenFinden(sk.abzeichen):null;
  const st=_abzStand[spielerId]||{bronze:new Set(),silber:new Set(),gemeldet:new Set()};
  const an=a?(TECHNIK_SILBER.includes(a)?st.silber:st.bronze).has(a.id):false, gem=a&&st.gemeldet&&st.gemeldet.has(a.id);
  return `<section class="skm" id="skm-karte" aria-label="Skill des Monats">
    <div class="skm-ueber">⭐ Skill des Monats</div>
    <div class="skm-titel">${a?a.emo+" ":""}${esc(sk.titel||"")}</div>
    ${sk.beschreibung?`<div class="skm-text">${esc(sk.beschreibung)}</div>`:""}
    <div class="skm-text">Schau es dir an und üb es zu Hause. Im Training üben wir es zusammen!</div>
    ${skillVideoHtml(sk,"skm-video")}
    ${a?`<button type="button" class="btn skm-abz" onclick="abzeichenDetail('${a.id}',${Number(spielerId)},${kidsMode?1:0})">${an?"✓ Schon geschafft – stark!":gem?"⏳ Gemeldet – zeig es beim nächsten Training":"So geht's – und dann melden"}</button>`:""}
  </section>`;
}
/* ═══ v980 · Skill des Monats beim Training abnehmen (Charles 26.11.: „der Skill des Monats muss von einem Trainer abgenommen
   werden bei einem Training“). In der Anwesenheit (Trainer-Bereich), für den gewählten Tag bis heute: die anwesenden Kinder, wer sich
   gemeldet hat zuerst. Abnehmen mit zwei Tipps (kalte Finger: der erste fragt, der zweite gilt) – vergibt Abzeichen und Federn über
   abzeichenAward wie bisher und löscht die Meldung. ═══ */
async function skillAbnahmeRender(datum){
  const box=document.getElementById("aw-skill"); if(!box)return;
  const sk=(typeof skillMonatLaden==="function")?await skillMonatLaden():null;
  const a=sk&&sk.abzeichen?abzeichenFinden(sk.abzeichen):null;
  if(!a||!datum||(typeof isoLokal==="function"&&datum>isoLokal())||!skillAbnahmeDarf()){ box.innerHTML=""; return; }
  const da=[...document.querySelectorAll("#aw-list .aw-tile.on")].map(b=>b.dataset.player);
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false&&da.includes(k.name)).map(k=>({name:k.name,id:Number(typeof kidId==="function"?kidId(k.name):k.id)})).filter(k=>k.id);
  const silber=TECHNIK_SILBER.includes(a);
  await Promise.all(kids.map(k=>abzeichenStandLaden(k.id).catch(()=>null)));
  const st=k=>_abzStand[k.id]||{bronze:new Set(),silber:new Set(),gemeldet:new Set()};
  const hat=k=>(silber?st(k).silber:st(k).bronze).has(a.id), gem=k=>!!(st(k).gemeldet&&st(k).gemeldet.has(a.id));
  kids.sort((x,y)=>(gem(y)-gem(x))||(hat(x)-hat(y)));
  const zeile=k=>hat(k)
    ?`<div class="skab-zeile skab-ok" style="display:flex;justify-content:space-between;align-items:center;min-height:48px;padding:0 12px;margin-top:8px;border:1px solid #15803d;border-radius:12px;background:#f0fdf4;color:#166534;font-weight:700"><span>✓ ${esc(k.name)}</span><span>abgenommen</span></div>`
    :`<button type="button" class="skab-zeile" data-sid="${k.id}" onclick="skillAbnehmen(${k.id},this)" style="display:flex;justify-content:space-between;align-items:center;width:100%;min-height:48px;padding:0 12px;margin-top:8px;border:1px solid ${gem(k)?"#b45309":"var(--rand-bedien)"};border-radius:12px;background:${gem(k)?"#fffbeb":"var(--surface)"};color:var(--text);font:inherit;font-size:var(--s-text);cursor:pointer;text-align:left">
        <span>${gem(k)?"🙋 ":""}${esc(k.name)}</span>${gem(k)?`<span class="skab-hin" style="font-size:var(--s-klein);font-weight:700;border:1px solid #b45309;color:#92400e;border-radius:99px;padding:2px 8px">möchte zeigen</span>`:`<span class="skab-hin" style="font-size:var(--s-klein);color:var(--text2)">antippen</span>`}</button>`;
  box.innerHTML=`<section id="skab" style="border:var(--border-s);border-radius:14px;padding:12px;margin-top:14px" aria-label="Skill des Monats abnehmen">
    <div style="font-weight:800;font-size:var(--s-karte)">⭐ Skill des Monats abnehmen</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:2px">${a.emo} ${esc(a.name)} · zweimal tippen = abgenommen (Abzeichen + ${silber?20:10} Federn)</div>
    ${kids.length?kids.map(zeile).join(""):'<div style="font-size:var(--s-text);color:var(--text2);margin-top:8px">Erst die Anwesenheit abhaken – dann stehen hier die Kinder, die da sind.</div>'}
  </section>`;
}
async function skillAbnehmen(sid,btn){
  const a=_skillMonat&&_skillMonat.abzeichen?abzeichenFinden(_skillMonat.abzeichen):null; if(!a||!btn)return;
  if(btn.dataset.sicher!=="1"){
    btn.dataset.sicher="1"; const hin=btn.querySelector(".skab-hin"), alt=hin?hin.textContent:""; if(hin)hin.textContent="nochmal tippen = abgenommen";
    btn.style.borderColor="#15803d"; clearTimeout(btn._t); btn._t=setTimeout(()=>{ btn.dataset.sicher=""; if(hin)hin.textContent=alt; btn.style.borderColor=""; },3500);
    return;
  }
  clearTimeout(btn._t);
  await abzeichenAward(sid,a.id,btn,TECHNIK_SILBER.includes(a)?"abzeichen_silber":"abzeichen");
  const de=document.getElementById("aw-date"); skillAbnahmeRender(de?de.value:"");
}
async function abzeichenAward(spielerId,badgeId,btn,quelle){
  if(btn)btn.disabled=true;
  try{
    const d=await xpAward(spielerId,quelle||"abzeichen",badgeId);
    abzeichenMeldungWeg(spielerId,badgeId);   // v962: eine offene Meldung des Kindes ist damit erledigt
    if(d>0){
      toast(`🎖️ Abzeichen geschafft – ${XP_ICON} +${d} ${XP_LABEL}!`);
      try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
      if(typeof confetti==="function")confetti(document.getElementById("abzeichen-modal"));
    }else{
      toast("Dieses Abzeichen hat dein Kind schon 👍");
    }
    abzeichenRender(spielerId);
  }catch(e){ toast("Hat nicht geklappt (online & angemeldet?)","err"); if(btn)btn.disabled=false; }
}
