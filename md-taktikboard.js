/* ═══════════════════════════════════
   TAKTIK-BOARD (Freies Drag & Drop)
═══════════════════════════════════ */
/* FORMATIONS: single source of truth für Spielformen der U9.
   x/y sind RELATIV (Prozent 0–100) -> skaliert automatisch mit der Feldgröße.
   tw:false = ohne Torwart (Funino). rk = Rollen-Schlüssel für Algorithmen/Rating.
   Steuert sowohl das Taktikboard als auch (später) die Matchday-Drop-Zonen. */
let tbFormation='4+1'; // aktuell gewählte Spielform des Boards (später aus termin.spielform)

let tbField=[];
let tbBench=[];
let tbBall={x:50,y:50};

/* ═══ v558 – BILDER AUF DEM BOARD ═══
   Dieselbe Idee wie bei den Übungsskizzen, nur auf dem Taktikboard: eine Spielsituation
   hat einen Vorher- und einen Nachher-Moment. Bisher ließ sich nur einer zeigen.

   Gespeichert wird das Board bereits als Positionsliste in Prozent (`ttSnapshot`) –
   ein Bild ist also nichts anderes als eine Kopie davon. Abgespielt wird über
   `transition` auf `left` und `top`; die Spielsteine liegen ohnehin absolut im Feld,
   es wird nichts neu gezeichnet. */
let tbBilder=[];          // [{field:[…], ball:{x,y}}] – Bild 1 ist immer der aktuelle Stand
let tbBildNr=0;
let tbLauft=false, tbUhr=null;
function _tbStand(){ return {field:tbField.map(p=>({...p})),ball:{...tbBall}}; }
function _tbSichern(){ if(tbBilder.length)tbBilder[tbBildNr]=_tbStand(); }
function _tbHolen(i){
  const b=tbBilder[i]; if(!b)return;
  tbField=b.field.map(p=>({...p})); tbBall={...b.ball};
}
function taktikBildNeu(){
  if(!tbField.length){ toast("Erst eine Aufstellung aufs Feld stellen","err"); return; }
  const max=(typeof SKZ_SCHRITTE_MAX!=="undefined")?SKZ_SCHRITTE_MAX:6;
  if(!tbBilder.length)tbBilder=[_tbStand()];
  else _tbSichern();
  if(tbBilder.length>max){ toast("Mehr als "+(max+1)+" Bilder werden unübersichtlich","info"); return; }
  tbBilder.splice(tbBildNr+1,0,_tbStand());
  tbBildNr++;
  taktikRender();
  toast("Bild "+(tbBildNr+1)+" angelegt – jetzt verschieben, was sich bewegt");
}
function taktikBildWahl(i){
  if(tbLauft)taktikAbspielenStopp();
  if(!tbBilder.length)return;
  _tbSichern();
  tbBildNr=Math.max(0,Math.min(tbBilder.length-1,Number(i)||0));
  _tbHolen(tbBildNr);
  taktikRender();
}
function taktikBildWeg(){
  if(!tbBilder.length||tbBildNr<1)return;
  tbBilder.splice(tbBildNr,1);
  tbBildNr=Math.min(tbBildNr-1,tbBilder.length-1);
  if(tbBilder.length<2)tbBilder=[];
  if(tbBilder.length)_tbHolen(tbBildNr);
  taktikRender();
}
function taktikAbspielenStopp(){
  tbLauft=false;
  if(tbUhr){ clearTimeout(tbUhr); tbUhr=null; }
  document.querySelectorAll("#taktik-tokens .tb-token,#taktik-tokens .tb-ball").forEach(t=>{ t.style.transition=""; });
  taktikBildLeiste();
}
function taktikAbspielen(){
  if(tbLauft){ taktikAbspielenStopp(); return; }
  if(tbBilder.length<2){ toast("Erst ein zweites Bild anlegen","info"); return; }
  _tbSichern();
  tbLauft=true; tbBildNr=0; _tbHolen(0); taktikRender();
  const sanft=(typeof _skzSanft==="function")?_skzSanft():true;
  const gleit=(typeof SKZ_GLEIT!=="undefined")?SKZ_GLEIT:800;
  const stand=(typeof SKZ_STAND!=="undefined")?SKZ_STAND:600;
  const weiter=()=>{
    if(!tbLauft)return;
    if(tbBildNr>=tbBilder.length-1){ taktikAbspielenStopp(); return; }
    tbBildNr++;
    if(sanft){
      /* Die Steine liegen absolut in Prozent – ein Übergang auf left/top genügt,
         nichts wird neu gebaut. */
      document.querySelectorAll("#taktik-tokens .tb-token,#taktik-tokens .tb-ball").forEach(t=>{
        t.style.transition="left "+gleit+"ms ease-in-out, top "+gleit+"ms ease-in-out";
      });
      _tbHolen(tbBildNr);
      const b=tbBilder[tbBildNr];
      [...document.querySelectorAll('#taktik-tokens .tb-token')].forEach((el,i)=>{
        const p=b.field[i]; if(!p)return; el.style.left=p.x+"%"; el.style.top=p.y+"%";
      });
      const ball=document.querySelector("#taktik-tokens .tb-ball");
      if(ball){ ball.style.left=b.ball.x+"%"; ball.style.top=b.ball.y+"%"; }
      tbUhr=setTimeout(weiter,gleit+stand);
    }else{
      _tbHolen(tbBildNr); taktikRender();
      tbUhr=setTimeout(weiter,(typeof SKZ_SCHNITT!=="undefined")?SKZ_SCHNITT:1400);
    }
    taktikBildLeiste();
  };
  taktikBildLeiste();
  tbUhr=setTimeout(weiter,stand);
}
/* Die Leiste steht unter dem Board. Ohne zweites Bild zeigt sie nur „+ Bild“ – wer sie
   nicht braucht, sieht also fast nichts davon. */
function taktikBildLeiste(){
  const box=document.getElementById("taktik-bilder"); if(!box)return;
  const n=tbBilder.length;
  let aus="";
  for(let i=0;i<n;i++){
    const an=tbBildNr===i;
    aus+='<button type="button" class="btn btn-sm'+(an?" btn-p":"")+'" onclick="taktikBildWahl('+i+')" aria-pressed="'+(an?"true":"false")+'">Bild '+(i+1)+'</button>';
  }
  aus+='<button type="button" class="btn btn-sm" onclick="taktikBildNeu()"><i class="ti ti-plus"></i>Bild</button>';
  if(n>1){
    aus+='<button type="button" class="btn btn-sm" onclick="taktikAbspielen()">'+(tbLauft?"⏸ Anhalten":"▶ Abspielen")+'</button>';
    if(tbBildNr>0)aus+='<button type="button" class="btn btn-sm" onclick="taktikBildWeg()"><i class="ti ti-trash"></i>Bild weg</button>';
  }
  box.innerHTML=aus;
}
function taktikSetup(mode){
  tbBilder=[]; tbBildNr=0; if(tbLauft)taktikAbspielenStopp();
  const names=kaderNamen();   // v510: nur Kinder, die noch dabei sind
  if(mode==="leer"){
    tbField=[];tbBench=[...names];tbBall={x:50,y:50};
    taktikRender();
    return;
  }
  const form=FORMATIONS[tbFormation]||FORMATIONS['4+1'];
  const slots=form.slots;
  const twName=form.tw?(kaderAktiv().find(k=>k.twPrio===1)?.name||null):null;
  tbField=[];tbBench=[];
  let assign=[];
  // Nur 4+1 hat den passenden Rollen-Kombinator (aufpasser/flitzer/jäger) – siehe FORMATIONS.
  if(tbFormation==='4+1'){
    const combo=calcBestCombos(verfuegbareSpieler()); // nie abgesagte Spieler aufs Feld stellen
    if(combo&&combo[0]){
      const b=combo[0];
      assign=[b.tw?.name||twName, b.aufpasser.name, b.flitzer_l.name, b.flitzer_r.name, b.jaeger.name];
    }
  }
  if(!assign.length){
    // Generische Befüllung (Funino/5+1 oder 4+1-Fallback): TW zuerst, dann Feldspieler der Reihe nach.
    const rest=names.filter(n=>n!==twName);
    let fi=0;
    assign=slots.map((s,i)=>{
      if(i===0&&form.tw)return twName;
      return rest[fi++]||null;
    });
  }
  slots.forEach((s,i)=>{
    if(assign[i]) tbField.push({name:assign[i],x:s.x,y:s.y,cls:s.cls,role:s.role});
  });
  const used=new Set(tbField.map(f=>f.name));
  tbBench=names.filter(n=>!used.has(n));
  tbBall={x:50,y:50};
  taktikRender();
}
function taktikSetFormation(f,btn){
  if(!FORMATIONS[f])return;
  tbFormation=f;
  document.querySelectorAll('.tb-form-btn').forEach(b=>b.classList.remove('btn-p'));
  if(btn)btn.classList.add('btn-p');
  else document.querySelector('.tb-form-btn[data-form="'+f+'"]')?.classList.add('btn-p');
  taktikSetup('auto');
}
function taktikInit(){taktikSetup("auto");}
function taktikReset(mode){taktikSetup(mode);}
/* Pro-Modus (17.4): Board auf Vollbild maximieren + feste Bank rechts. Reiner CSS-State
   (body.taktik-pro), zusätzlich best-effort echtes Fullscreen fürs Tablet an der Linie. */
function taktikProToggle(){
  const on=document.body.classList.toggle("taktik-pro");
  document.getElementById("tb-pro-btn")?.classList.toggle("btn-p",on);
  try{
    if(on){document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{});}
    else if(document.fullscreenElement){document.exitFullscreen&&document.exitFullscreen().catch(()=>{});}
  }catch(e){}
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
}
// Verlässt der Trainer das Fullscreen per ESC/Systemgeste, den Pro-State mitziehen.
document.addEventListener("fullscreenchange",()=>{
  if(!document.fullscreenElement&&document.body.classList.contains("taktik-pro")){
    document.body.classList.remove("taktik-pro");
    document.getElementById("tb-pro-btn")?.classList.remove("btn-p");
  }
});

// Aufstellung als sauberes PNG rendern und per Web Share API teilen (Fallback: Download).
// Zeichnet Feld + Tokens auf ein Canvas – kein html2canvas o.ä. nötig.
// tbRoundRect wohnt seit v391 in engine.js (Welle 1): views.js zeichnet damit
// Karten und Diagramme und darf dafuer nicht auf ein Welle-2-Modul warten.
function taktikShareBild(){
  if(!tbField||!tbField.length){toast("Erst eine Aufstellung aufs Feld stellen","err");return;}
  const W=600,H=800;
  const canvas=document.createElement("canvas");
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  // Rasen + Linien (analog zum SVG-Feld)
  ctx.fillStyle="#2d6a2d";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(255,255,255,.45)";ctx.lineWidth=3;
  ctx.strokeRect(16,16,W-32,H-32);
  ctx.beginPath();ctx.moveTo(16,H/2);ctx.lineTo(W-16,H/2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,80,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.45)";ctx.fill();
  const col={"tb-tw":"#854d0e","tb-auf":"#1a56db","tb-fl":"#059669","tb-jaeg":"#c2410c","tb-frei":"#475569","tb-bench":"#64748b"};
  ctx.textAlign="center";ctx.textBaseline="middle";
  tbField.forEach(p=>{
    const x=p.x/100*W, y=p.y/100*H;
    const label=p.name||"";
    ctx.font="bold 16px Arial";
    const tw=ctx.measureText(label).width;
    const pillH=36, pillW=Math.max(52,tw+28);
    ctx.fillStyle=col[p.cls]||"#475569";
    tbRoundRect(ctx,x-pillW/2,y-pillH/2,pillW,pillH,pillH/2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle="#fff";ctx.fillText(label,x,y);
  });
  // Ball
  if(typeof tbBall==="object"&&tbBall){
    ctx.fillStyle="#fff";ctx.strokeStyle="#222";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(tbBall.x/100*W,tbBall.y/100*H,9,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  // Titelzeile
  ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 22px Arial";ctx.textBaseline="alphabetic";
  ctx.fillText("SV Adler Dellbrück · U9 · "+((FORMATIONS[tbFormation]||FORMATIONS['4+1']).label),W/2,H-22);

  canvas.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"aufstellung-u9.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Aufstellung U9",text:"Aufstellung SV Adler Dellbrück U9"});}
      catch(e){/* Nutzer hat abgebrochen */}
    }else{
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="aufstellung-u9.png";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Bild heruntergeladen ✓");
    }
  },"image/png");
}

function taktikRender(){
  taktikBildLeiste();
  const fieldEl=document.getElementById("taktik-field");
  const benchEl=document.getElementById("taktik-bench");
  if(!fieldEl||!benchEl)return;
  const tokensEl=document.getElementById("taktik-tokens");
  tokensEl.innerHTML="";
  benchEl.innerHTML="";

  tbField.forEach((p,i)=>{
    const tok=tbCreateToken(p.name,p.cls||"tb-auf",p.role||"");
    tok.style.left=p.x+"%";tok.style.top=p.y+"%";
    tok.dataset.idx=i;tok.dataset.loc="field";
    if(tqActive&&p.locked){ // K5: gesperrte Spieler klar kennzeichnen
      tok.style.opacity=".5";
      tok.classList.add("tq-locked");
      tok.insertAdjacentHTML("beforeend",'<span class="tb-lock-badge">🔒</span>');
    }
    tbAddDrag(tok,fieldEl);
    tokensEl.appendChild(tok);
  });

  const ballEl=document.createElement("div");
  ballEl.className="tb-ball";
  ballEl.style.cssText=`position:absolute;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#e2e8f0);border:2px solid rgba(0,0,0,.3);transform:translate(-50%,-50%);cursor:grab;z-index:15;box-shadow:0 2px 6px rgba(0,0,0,.3);left:${tbBall.x}%;top:${tbBall.y}%`;
  ballEl.dataset.loc="ball";
  tbAddDrag(ballEl,fieldEl);
  tokensEl.appendChild(ballEl);

  tbBench.forEach(name=>{
    const tok=tbCreateToken(name,"tb-bench","");
    tok.dataset.loc="bench";
    tbAddDrag(tok,fieldEl);
    benchEl.appendChild(tok);
  });

  if(tqActive&&tqCurrentOpps.length){
    tqCurrentOpps.forEach(o=>{
      const el=document.createElement("div");
      el.className="tb-token tb-opp";
      el.innerHTML=`<span class="tb-name">${o.label||"Gegner"}</span>`;
      const ox=o.to?o.to.x:o.x, oy=o.to?o.to.y:o.y;
      el.style.cssText=`position:absolute;z-index:8;left:${ox}%;top:${oy}%;transform:translate(-50%,-50%)`;
      tokensEl.appendChild(el);
    });
  }
}

