/* ═══════════════════════════════════
   TECHNIK-ABZEICHEN – echte Off-Screen-Challenges, ELTERN haken ab.
   Schafft das Kind eine Übung zuhause/beim Spielen → Eltern bestätigen → Federn (einmalig
   pro Abzeichen via quelle_id). Erledigte kommen aus xp_events_for (append-only punkte_log).
   IDs sind STABIL (nie umbenennen → sonst Doppel-Gutschrift). Vertrauens-Modell ok: kein
   Ranking, Federn speisen nur die eigene Karte – „Schummeln" bringt niemandem etwas.
═══════════════════════════════════ */
const TECHNIK_ABZEICHEN=[
  {id:"ab_jonglier",emo:"🤹",name:"Ball-Jongleur",desc:"Halte den Ball 5× hoch, ohne dass er runterfällt."},
  {id:"ab_beidfuss",emo:"🦶",name:"Beidfüßer",desc:"Spiele 10× mit rechts und 10× mit links gegen eine Wand."},
  {id:"ab_slalom",emo:"🐍",name:"Slalom-König",desc:"Dribble durch 5 Hütchen (oder Schuhe), ohne eins umzuwerfen."},
  {id:"ab_innenseite",emo:"🎯",name:"Pass-Meister",desc:"Triff eine Wand aus 3 m 10× mit der Fuß-Innenseite."},
  {id:"ab_sohle",emo:"↩️",name:"Sohlen-Roller",desc:"Rolle den Ball 10× mit der Sohle vor und zurück."},
  {id:"ab_torschuss",emo:"⚽",name:"Torjäger",desc:"Triff 5× aus 5 m ins (kleine) Tor."},
  /* v961 · Charles 24.11.: „Aber keine Kopfball mehr.“ Die Kennung bleibt (Federn sind vergeben), das Abzeichen steht nirgends mehr. */
  {id:"ab_kopfball",emo:"🧠",name:"Kopfball-Held",desc:"Köpfe einen weichen Ball 3× ganz sanft.",alt:true},
  {id:"ab_ausdauer",emo:"🏃",name:"Ausdauer-Adler",desc:"Spiele oder laufe 10 Minuten am Stück ohne Pause."},
  {id:"ab_trick",emo:"✨",name:"Trick-Meister",desc:"Übe einen Übersteiger und schaff ihn 3× hintereinander."},
  {id:"ab_stoppen",emo:"🛑",name:"Ball-Stopper",desc:"Nimm einen zugeworfenen Ball 5× sauber an und stoppe ihn."}
];
/* ═══ v961 · Adler-Akademie, Praxis (Charles 24.11.2026, Bild freigegeben): „Dann brauchen wir auch eine nächste Stufe der aktuellen
   Technik-Abzeichen. Weitere Übungen für die Kinder zu Hause … Aber keine Kopfball mehr.“ Silber öffnet ab 8 von 9 Bronze; wer das
   Kopfball-Abzeichen schon hat, dem zählt es mit („Wer die ersten Skill-Abzeichen schon hat, geht direkt auf Silber“). Silber-Federn
   kommen aus der eigenen Quelle „abzeichen_silber“ (20 statt 10, Migration v961). IDs STABIL, wie oben. */
const TECHNIK_SILBER=[
  {id:"ab2_jonglier",emo:"🤹",name:"Jongleur-Profi",desc:"10× hochhalten, ohne dass der Ball aufkommt.",schritte:["Lass den Ball aus der Hand auf den Fuß fallen.","Spiel ihn mit Fuß oder Oberschenkel wieder hoch.","Zähl laut mit – bei 10 ist das Abzeichen geschafft."],tipp:"Fußspitze leicht hoch, dann springt der Ball gerade nach oben."},
  {id:"ab2_doppelpass",emo:"🔄",name:"Wand-Doppelpass",desc:"20 Pässe gegen die Wand, rechts und links im Wechsel.",schritte:["Stell dich drei Schritte vor eine Wand.","Pass mit rechts, nimm mit links an.","Dann umgekehrt – 20 Pässe ohne Fehler."],tipp:"Ball flach spielen, mit der Innenseite."},
  {id:"ab2_slalom",emo:"⏱️",name:"Slalom-Sprint",desc:"6 Hütchen hin und zurück in unter 20 Sekunden.",schritte:["Stell 6 Hütchen oder Schuhe in eine Reihe, je zwei große Schritte Abstand.","Dribble hin und zurück durch alle durch.","Mama oder Papa stoppt die Zeit."],tipp:"Kleine Schritte, der Ball bleibt nah am Fuß."},
  {id:"ab2_zielpass",emo:"🎯",name:"Ziel-Pass",desc:"Aus 5 m 7 von 10 Pässen zwischen zwei Schuhen durch.",schritte:["Leg zwei Schuhe einen großen Schritt auseinander – das ist dein Tor.","Geh fünf große Schritte weg.","Spiel 10 Pässe – 7 müssen durchgehen."],tipp:"Standbein neben den Ball, Blick aufs Ziel."},
  {id:"ab2_schwach",emo:"🦶",name:"Schwacher Fuß",desc:"3 Tore aus 5 m mit dem schwächeren Fuß.",schritte:["Nimm den Fuß, mit dem du sonst nicht schießt.","Schieß aus fünf großen Schritten aufs Tor.","Drei Treffer – fertig."],tipp:"Erst genau, dann fest."},
  {id:"ab2_cruyff",emo:"🌀",name:"Cruyff-Drehung",desc:"5× sauber drehen und mit dem Ball weiterlaufen.",schritte:["Lauf mit dem Ball los und tu so, als ob du schießt.","Zieh den Ball mit der Innenseite hinter dem Standbein vorbei.","Dreh dich mit und lauf in die andere Richtung weiter."],tipp:"Langsam üben, dann schneller werden."},
  {id:"ab2_luftstopp",emo:"🛑",name:"Luft-Stopper",desc:"Ball hochwerfen und 5× so stoppen, dass er im Kreis bleibt.",schritte:["Mach einen Kreis, so groß wie ein großer Schritt.","Wirf den Ball hoch und stopp ihn mit Fuß oder Oberschenkel.","Er muss im Kreis liegen bleiben – 5× geschafft?"],tipp:"Den Ball weich annehmen – wie ein Kissen."},
  {id:"ab2_sohlenkreis",emo:"↩️",name:"Sohlen-Kreis",desc:"Ball mit der Sohle einmal um dich herum, mit beiden Füßen.",schritte:["Stell die Sohle auf den Ball.","Zieh ihn in kleinen Schritten einmal rund um dich herum.","Dann mit dem anderen Fuß in die andere Richtung."],tipp:"Kleine Stupser, der Ball bleibt dicht bei dir."},
  {id:"ab2_abschirmen",emo:"🛡️",name:"Ball behalten",desc:"30 Sekunden den Ball gegen Mama oder Papa abschirmen.",schritte:["Mama oder Papa versucht, an den Ball zu kommen – ohne zu rempeln.","Stell dich mit dem Körper zwischen Ball und Gegner.","Halte den Ball 30 Sekunden."],tipp:"Arme leicht ausbreiten, Ball am Fuß weg vom Gegner."},
  {id:"ab2_tennis",emo:"🎾",name:"Fußball-Tennis",desc:"10 Ballwechsel mit der Familie über eine Linie – nur mit dem Fuß.",schritte:["Leg eine Linie (Seil, Schuhe, Kreide) zwischen euch.","Spielt euch den Ball über die Linie zu, er darf einmal aufkommen.","Schafft ihr 10 Ballwechsel?"],tipp:"Nur Fuß und Oberschenkel – kein Kopf."}
];
const ABZ_SILBER_AB=8;
const ABZ_STUFEN=[
  {key:"bronze",emo:"🥉",name:"Bronze",quelle:"abzeichen",liste:()=>TECHNIK_ABZEICHEN.filter(a=>!a.alt)},
  {key:"silber",emo:"🥈",name:"Silber",quelle:"abzeichen_silber",liste:()=>TECHNIK_SILBER}
];
function abzeichenFinden(id){ return TECHNIK_ABZEICHEN.concat(TECHNIK_SILBER).find(a=>a.id===id)||null; }
let _abzStand={};   // spielerId → {bronze:Set, silber:Set}
async function abzeichenStandLaden(spielerId){
  const hol=async q=>{ try{ const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_events_for`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:q})}); return r.ok?((await r.json())||[]):[]; }catch(e){ return []; } };
  const [b,s]=await Promise.all([hol("abzeichen"),hol("abzeichen_silber")]);
  _abzStand[spielerId]={bronze:new Set(b.map(String)),silber:new Set(s.map(String))};
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
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:12px">${kidsMode?`Übe zu Hause! Neue Abzeichen trägt Mama oder Papa im Eltern-Bereich ein – dann gibt's Adler-Federn ${XP_ICON}.`:`Schafft dein Kind eine Übung, trag sie ein – es gibt Adler-Federn ${XP_ICON} (Bronze 10, Silber 20).`}</div>
    <div id="abzeichen-list" data-spieler="${Number(spielerId)}" data-kids="${kidsMode?1:0}"><div style="color:var(--text3);font-size:var(--s-text)">Lade…</div></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('abzeichen-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  abzeichenRender(spielerId,kidsMode);
}
/* Der Trainingsplatz als HTML – im Fenster und in der Akademie (quiz.js) derselbe. */
function abzeichenPlatzHtml(spielerId,kidsMode){
  const st=_abzStand[spielerId]||{bronze:new Set(),silber:new Set()};
  const bronze=abzeichenBronzeZahl(st), offenSilber=bronze>=ABZ_SILBER_AB;
  const zeile=(a,stufe,an)=>`<div class="abz-zeile${an?" abz-an":""}">
      <button type="button" class="abz-info" onclick="abzeichenDetail('${a.id}',${Number(spielerId)},${kidsMode?1:0})" aria-label="${esc(a.name)} – so geht's">
        <span class="abz-emo" aria-hidden="true">${a.emo}</span>
        <span class="abz-txt"><b>${esc(a.name)}${an?" ✓":""}</b><small>${esc(a.desc)}</small></span></button>
      ${an?`<span class="abz-ok">✓ geschafft</span>`:(kidsMode?`<span class="abz-offen">offen</span>`:`<button class="btn btn-sm" onclick="abzeichenAward(${Number(spielerId)},'${a.id}',this,'${stufe.quelle}')" data-el-fest="1" style="flex:none;white-space:nowrap;justify-content:center">Geschafft</button>`)}
    </div>`;
  const teil=(stufe,zu)=>{ const l=stufe.liste(), n=stufe.key==="bronze"?bronze:l.filter(a=>st.silber.has(a.id)).length;
    return `<section class="abz-stufe${zu?" abz-zu":""}" aria-label="${stufe.name}">
      <h3 class="abz-stufe-k"><span>${stufe.emo} ${stufe.name}</span><span class="abz-zahl">${zu?"🔒":`${n}/${l.length}`}</span></h3>
      ${zu?`<div class="abz-hinweis">Noch ${ABZ_SILBER_AB-bronze} Bronze-${ABZ_SILBER_AB-bronze===1?"Abzeichen":"Abzeichen"}, dann öffnet Silber.</div>`
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
  const st=_abzStand[spielerId]||{bronze:new Set(),silber:new Set()}, an=(silber?st.silber:st.bronze).has(a.id);
  const {karte}=fensterAuf("abz-detail",{mitte:true,breite:420,aussen:true});
  const schritte=a.schritte||[a.desc];
  const text=[a.name,...schritte,a.tipp?("Tipp: "+a.tipp):""].filter(Boolean).join(". ");
  karte.innerHTML=`${mdlHead("abz-detail",a.emo,esc(a.name),(silber?"🥈 Silber":"🥉 Bronze")+" · zu Hause oder im Garten","#6d28d9")}
    <ol class="abz-schritte">${schritte.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>
    ${a.tipp?`<div class="abz-tipp">💡 ${esc(a.tipp)}</div>`:""}
    ${("speechSynthesis" in window)?`<button type="button" class="btn" onclick="abzeichenVorlesen(this)" data-text="${esc(text)}" style="width:100%;min-height:48px;margin-top:10px;justify-content:center"><i class="ti ti-volume"></i>Vorlesen</button>`:""}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:10px">${an?"✓ Schon geschafft – stark!":(kidsMode?"Geschafft? Mama oder Papa hakt es im Eltern-Bereich ab.":"")}</div>
    ${(!an&&!kidsMode)?`<button type="button" class="btn btn-p" onclick="document.getElementById('abz-detail')?.remove();abzeichenAward(${Number(spielerId)},'${a.id}',null,'${silber?"abzeichen_silber":"abzeichen"}')" style="width:100%;min-height:56px;margin-top:10px;justify-content:center"><i class="ti ti-check"></i>Als geschafft eintragen</button>`:""}`;
}
function abzeichenVorlesen(k){
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(k.dataset.text||""); u.lang="de-DE"; u.rate=.95; speechSynthesis.speak(u); }catch(e){}
}
async function abzeichenAward(spielerId,badgeId,btn,quelle){
  if(btn)btn.disabled=true;
  try{
    const d=await xpAward(spielerId,quelle||"abzeichen",badgeId);
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
