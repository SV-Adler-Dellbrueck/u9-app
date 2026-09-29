/* ═══════════════════════════════════
   VIDEO-TAKTIKBOARD (Phase 9-I) – Handy-Clip laden, pausieren, Laufwege einzeichnen.
   Architektur-Kern (siehe Tech-Lead-Analyse):
   • <video playsinline> – sonst iOS-Vollbild-Hijack; lokaler objectURL (ephemer, kein Upload)
   • Striche in NORMALISIERTEN [0..1]-Koordinaten relativ zum echten Videoinhalt
     (object-fit-sicher), damit Resize/Rotation/Fullscreen nichts zerschießt
   • Zeichnen wie am Feld-Board (Pass rot gestrichelt / Laufweg blau mit Pfeil)
═══════════════════════════════════ */
let vtbStrokes=[], vtbCur=null, vtbMode="lauf", vtbURL=null;
function vtbOpen(){
  if(document.getElementById("vtb-modal"))return;
  vtbStrokes=[];vtbCur=null;vtbMode="lauf";
  const m=document.createElement("div");
  m.id="vtb-modal";
  m.style.cssText="position:fixed;inset:0;z-index:10000;background:#000;display:flex;flex-direction:column";
  m.innerHTML=`
    <div id="vtb-stage" style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <div id="vtb-empty" style="color:#94a3b8;text-align:center;padding:24px;font-size:var(--s-karte);line-height:1.6">🎥 Lade einen kurzen Clip (z. B. 10 Sek) vom Handy,<br>pausiere und zeichne Laufwege ein.</div>
      <video id="vtb-video" playsinline webkit-playsinline style="max-width:100%;max-height:100%;display:none"></video>
      <canvas id="vtb-canvas" style="position:absolute;touch-action:none;display:none"></canvas>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:10px;background:#0f172a">
      <button class="btn btn-sm" onclick="document.getElementById('vtb-file').click()"><i class="ti ti-upload"></i>Clip laden</button>
      <button class="btn btn-sm" id="vtb-play" onclick="vtbPlayPause()" disabled><i class="ti ti-player-play"></i>Play</button>
      <button class="btn btn-sm btn-p" id="vtb-lauf" onclick="vtbSetMode('lauf',this)">→ Laufweg</button>
      <button class="btn btn-sm" id="vtb-pass" onclick="vtbSetMode('pass',this)">╌ Pass</button>
      <button class="btn btn-sm" onclick="vtbUndo()" title="Rückgängig"><i class="ti ti-arrow-back-up"></i></button>
      <button class="btn btn-sm" onclick="vtbClear()" title="Alles weg"><i class="ti ti-eraser"></i></button>
      <button class="btn btn-sm" onclick="vtbShare()"><i class="ti ti-share"></i>Bild</button>
      <button class="btn btn-sm" onclick="vtbClose()">Schließen</button>
    </div>
    <input type="file" id="vtb-file" accept="video/*" style="display:none" onchange="vtbLoadFile(this)">`;
  document.body.appendChild(m);
  const v=document.getElementById("vtb-video");
  v.addEventListener("loadedmetadata",()=>requestAnimationFrame(vtbLayout));
  v.addEventListener("loadeddata",()=>requestAnimationFrame(vtbLayout));
  v.addEventListener("play",vtbSyncPlayBtn);
  v.addEventListener("pause",vtbSyncPlayBtn);
  window.addEventListener("resize",vtbLayout);
  vtbBindDraw();
}
function vtbClose(){
  window.removeEventListener("resize",vtbLayout);
  if(vtbURL){URL.revokeObjectURL(vtbURL);vtbURL=null;}
  document.getElementById("vtb-modal")?.remove();
}
function vtbLoadFile(input){
  const f=input.files&&input.files[0];if(!f)return;
  if(vtbURL)URL.revokeObjectURL(vtbURL);
  vtbURL=URL.createObjectURL(f);
  vtbStrokes=[];
  const v=document.getElementById("vtb-video");
  v.src=vtbURL;v.style.display="";
  document.getElementById("vtb-empty").style.display="none";
  document.getElementById("vtb-canvas").style.display="";
  document.getElementById("vtb-play").disabled=false;
  v.load();
}
// Videoinhalt-Rechteck (object-fit-sicher) relativ zur Stage berechnen.
function vtbRect(){
  const v=document.getElementById("vtb-video"),stage=document.getElementById("vtb-stage");
  if(!v||!v.videoWidth||!stage)return null;
  const sr=stage.getBoundingClientRect(), vr=v.getBoundingClientRect();
  const scale=Math.min(vr.width/v.videoWidth, vr.height/v.videoHeight);
  const dispW=v.videoWidth*scale, dispH=v.videoHeight*scale;
  return {left:(vr.left-sr.left)+(vr.width-dispW)/2, top:(vr.top-sr.top)+(vr.height-dispH)/2, w:dispW, h:dispH};
}
function vtbLayout(){
  const c=document.getElementById("vtb-canvas"),r=vtbRect();
  if(!c||!r)return;
  const dpr=window.devicePixelRatio||1;
  c.style.left=r.left+"px";c.style.top=r.top+"px";c.style.width=r.w+"px";c.style.height=r.h+"px";
  c.width=Math.max(1,Math.round(r.w*dpr));c.height=Math.max(1,Math.round(r.h*dpr));
  vtbRedraw();
}
function vtbPos(e){
  const c=document.getElementById("vtb-canvas"),r=c.getBoundingClientRect();
  const pt=e.touches?e.touches[0]:e;
  return {x:Math.max(0,Math.min(1,(pt.clientX-r.left)/r.width)), y:Math.max(0,Math.min(1,(pt.clientY-r.top)/r.height))};
}
function vtbBindDraw(){
  const c=document.getElementById("vtb-canvas");
  c.addEventListener("pointerdown",e=>{e.preventDefault();vtbCur={mode:vtbMode,points:[vtbPos(e)]};vtbStrokes.push(vtbCur);vtbRedraw();});
  c.addEventListener("pointermove",e=>{if(!vtbCur)return;e.preventDefault();vtbCur.points.push(vtbPos(e));vtbRedraw();});
  window.addEventListener("pointerup",()=>{vtbCur=null;});
}
function vtbSetMode(m,btn){vtbMode=m;["vtb-lauf","vtb-pass"].forEach(id=>document.getElementById(id)?.classList.remove("btn-p"));btn.classList.add("btn-p");}
function vtbPlayPause(){const v=document.getElementById("vtb-video");if(!v.src)return;if(v.paused)v.play();else v.pause();}
function vtbSyncPlayBtn(){const v=document.getElementById("vtb-video"),b=document.getElementById("vtb-play");if(!b||!v)return;b.innerHTML=v.paused?'<i class="ti ti-player-play"></i>Play':'<i class="ti ti-player-pause"></i>Pause';}
function vtbUndo(){vtbStrokes.pop();vtbRedraw();}
function vtbClear(){vtbStrokes=[];vtbRedraw();}
function vtbDrawStrokes(ctx,W,H){
  vtbStrokes.forEach(s=>{
    const pts=s.points;if(!pts.length)return;
    ctx.lineWidth=Math.max(2,W*0.008);ctx.lineJoin="round";ctx.lineCap="round";
    if(s.mode==="pass"){ctx.strokeStyle="#fde047";ctx.setLineDash([W*0.03,W*0.022]);}  // HOTFIX 17: High-Vis Neon-Gelb
    else{ctx.strokeStyle="#ffffff";ctx.setLineDash([]);}                                 // HOTFIX 17: High-Vis Weiß
    ctx.beginPath();ctx.moveTo(pts[0].x*W,pts[0].y*H);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x*W,pts[i].y*H);
    ctx.stroke();
    if(s.mode==="lauf"&&pts.length>=2){
      const a=pts[pts.length-2],b=pts[pts.length-1];
      const ax=a.x*W,ay=a.y*H,bx=b.x*W,by=b.y*H,ang=Math.atan2(by-ay,bx-ax),L=W*0.035;
      ctx.setLineDash([]);ctx.beginPath();
      ctx.moveTo(bx,by);ctx.lineTo(bx-L*Math.cos(ang-.42),by-L*Math.sin(ang-.42));
      ctx.moveTo(bx,by);ctx.lineTo(bx-L*Math.cos(ang+.42),by-L*Math.sin(ang+.42));
      ctx.stroke();
    }
  });
  ctx.setLineDash([]);
}
function vtbRedraw(){
  const c=document.getElementById("vtb-canvas");if(!c)return;
  const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);
  vtbDrawStrokes(ctx,c.width,c.height);
}
async function vtbShare(){
  const v=document.getElementById("vtb-video");
  if(!v||!v.videoWidth){toast("Erst einen Clip laden","err");return;}
  const W=v.videoWidth,H=v.videoHeight;
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const ctx=cv.getContext("2d");
  try{ctx.drawImage(v,0,0,W,H);}catch(e){toast("Frame noch nicht bereit – kurz abspielen","err");return;}
  vtbDrawStrokes(ctx,W,H);
  cv.toBlob(async b=>{
    if(!b)return;
    const file=new File([b],"taktik-video.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"Taktik"});}catch(e){}}
    else{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="taktik-video.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("Bild gespeichert ✓");}
  },"image/png");
}

function tbCreateToken(name,cls,roleLabel){
  const el=document.createElement("div");
  el.className="tb-token "+cls;
  el.dataset.player=name;
  const nr=getKader(name)?.nr; // L1: Trikotnummer, wenn vorhanden
  el.innerHTML=`${nr?`<span class="tb-nr">${nr}</span>`:""}<span class="tb-name">${name}</span>${roleLabel?`<span class="tb-pos">${roleLabel}</span>`:""}`;
  return el;
}

function tbDetectRole(x,y){
  const zones=[
    {role:"TW",cls:"tb-tw",x:50,y:92},
    {role:"Aufpasser",cls:"tb-auf",x:50,y:72},
    {role:"Flitzer L",cls:"tb-fl",x:20,y:48},
    {role:"Flitzer R",cls:"tb-fl",x:80,y:48},
    {role:"Jäger",cls:"tb-jaeg",x:50,y:25}
  ];
  let best=zones[0],bestDist=Infinity;
  zones.forEach(z=>{
    const d=Math.sqrt((x-z.x)**2+(y-z.y)**2);
    if(d<bestDist){bestDist=d;best=z;}
  });
  return{role:best.role,cls:best.cls};
}

const TB_ROLE_CYCLE=[
  {role:"",cls:"tb-frei"},
  {role:"TW",cls:"tb-tw"},
  {role:"Aufpasser",cls:"tb-auf"},
  {role:"Flitzer L",cls:"tb-fl"},
  {role:"Flitzer R",cls:"tb-fl"},
  {role:"Jäger",cls:"tb-jaeg"}
];

function tbCycleRole(idx){
  const p=tbField[idx];if(!p)return;
  const curIdx=TB_ROLE_CYCLE.findIndex(r=>r.role===p.role);
  const next=(curIdx+1)%TB_ROLE_CYCLE.length;
  p.role=TB_ROLE_CYCLE[next].role;
  p.cls=TB_ROLE_CYCLE[next].cls;
  taktikRender();
}

const tbActiveDrags=new Set(); // Registry aktiver Drags, damit ein Szenariowechsel sie sauber beenden kann
function tbCancelActiveDrags(){tbActiveDrags.forEach(cancel=>cancel());tbActiveDrags.clear();}

function tbAddDrag(tok,fieldEl){
  let startX,startY,origLeft,origTop,fromBench,fieldRect,isBall,didMove,moveThreshold=8,touchId=null;

  function touchById(list,id){
    if(id==null)return list[0];
    for(let i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];
    return null;
  }

  function onStart(e){
    if(e.type==="touchstart")e.preventDefault();
    const _idx=parseInt(tok.dataset.idx);
    if(tqActive&&!isNaN(_idx)&&tbField[_idx]&&tbField[_idx].locked)return;
    didMove=false;
    touchId=e.changedTouches?e.changedTouches[0].identifier:null; // welcher Finger diesen Drag gestartet hat
    tok.style.zIndex="25";
    tok.style.transition="none";
    tok.style.willChange="left,top";
    fieldRect=fieldEl.getBoundingClientRect();
    const pt=e.touches?touchById(e.touches,touchId):e;
    startX=pt.clientX;startY=pt.clientY;
    fromBench=tok.dataset.loc==="bench";
    isBall=tok.dataset.loc==="ball";
    if(!fromBench){
      origLeft=parseFloat(tok.style.left);
      origTop=parseFloat(tok.style.top);
    } else {
      const r=tok.getBoundingClientRect();
      origLeft=((r.left+r.width/2-fieldRect.left)/fieldRect.width)*100;
      origTop=((r.top+r.height/2-fieldRect.top)/fieldRect.height)*100;
    }
    document.addEventListener("mousemove",onMove,{passive:false});
    document.addEventListener("mouseup",onEnd);
    document.addEventListener("touchmove",onMove,{passive:false});
    document.addEventListener("touchend",onEnd);
    tbActiveDrags.add(cancelDrag);
  }

  function onMove(e){
    const pt=e.touches?touchById(e.touches,touchId):e;
    if(!pt)return; // ein ANDERER Finger hat sich bewegt – dieser Drag ist nicht betroffen (Multitouch-Fix)
    e.preventDefault();
    const rawDx=pt.clientX-startX,rawDy=pt.clientY-startY;
    if(!didMove&&Math.abs(rawDx)<moveThreshold&&Math.abs(rawDy)<moveThreshold)return;
    const dx=(rawDx/fieldRect.width)*100;
    const dy=(rawDy/fieldRect.height)*100;
    const nx=Math.max(3,Math.min(97,origLeft+dx));
    const ny=Math.max(3,Math.min(97,origTop+dy));
    didMove=true;
    if(fromBench){
      const tokensEl=document.getElementById("taktik-tokens");
      if(tok.parentElement!==tokensEl){
        tok.style.position="absolute";
        tok.style.transform="translate(-50%,-50%)";
        tokensEl.appendChild(tok);
      }
    }
    tok.style.left=nx+"%";tok.style.top=ny+"%";
  }

  function cancelDrag(){ // wird bei Szenariowechsel mitten im Drag aufgerufen (Cleanup-Fix)
    document.removeEventListener("mousemove",onMove);
    document.removeEventListener("mouseup",onEnd);
    document.removeEventListener("touchmove",onMove);
    document.removeEventListener("touchend",onEnd);
  }

  function onEnd(e){
    if(e.changedTouches&&touchById(e.changedTouches,touchId)===null)return; // falscher Finger losgelassen
    tbActiveDrags.delete(cancelDrag);
    document.removeEventListener("mousemove",onMove);
    document.removeEventListener("mouseup",onEnd);
    document.removeEventListener("touchmove",onMove);
    document.removeEventListener("touchend",onEnd);
    tok.style.zIndex=isBall?"15":"10";
    tok.style.transition="";
    tok.style.willChange="auto";

    if(!didMove&&!isBall&&!fromBench){
      const idx=parseInt(tok.dataset.idx);
      if(!isNaN(idx)){
        if(tqActive&&tbField[idx]&&!tbField[idx].locked){tqSelectToken(tok);return;}
        tbCycleRole(idx);return;
      }
    }

    const finalX=parseFloat(tok.style.left);
    const finalY=parseFloat(tok.style.top);

    if(isBall){
      tbBall.x=finalX;tbBall.y=finalY;
      return;
    }

    const pt=e.changedTouches?e.changedTouches[0]:e;
    const benchRect=document.getElementById("taktik-bench").getBoundingClientRect();
    const onBench=pt.clientY>=benchRect.top-20&&pt.clientX>=benchRect.left&&pt.clientX<=benchRect.right;
    const playerName=tok.dataset.player;

    if(onBench){
      const idx=parseInt(tok.dataset.idx);
      if(!isNaN(idx)) tbField.splice(idx,1);
      if(!tbBench.includes(playerName)) tbBench.push(playerName);
      taktikRender();
      return;
    }

    if(fromBench){
      /* Von der Bank aufs Feld: hier IST die Ablage-Stelle die Auskunft über die Rolle,
         das Kind hatte vorher keine. Funino kennt keine festen Rollen – dort kommt es
         ohne auf den Platz (das fehlte bisher, die Zonen wurden auch dort befragt). */
      tbBench=tbBench.filter(n=>n!==playerName);
      if(tbFormation==='funino'){
        tbField.push({name:playerName,x:finalX,y:finalY,cls:"tb-frei",role:""});
      }else{
        const detected=tbDetectRole(finalX,finalY);
        tbField.push({name:playerName,x:finalX,y:finalY,cls:detected.cls,role:detected.role});
      }
      taktikRender();
    } else {
      const idx=parseInt(tok.dataset.idx);
      if(!isNaN(idx)&&tbField[idx]){
        /* NUR die Position ändert sich – die Rolle bleibt, wo sie war.
           Vorher wurde nach jedem Ziehen tbDetectRole() befragt und die Rolle aus der
           nächstgelegenen Zone neu gesetzt. Genau das macht das Board unbrauchbar für
           das, wofür es da ist: Laufwege zeigen. Schiebt man den Flitzer R zum Tor,
           um einen Konter zu erklären, wurde aus ihm ein Jäger – und plötzlich standen
           zwei Jäger auf dem Feld (PO v400). Die Rolle wechselt jetzt ausschließlich
           durch Antippen (tbCycleRole), also bewusst.
           Beim Einwechseln von der Bank wird weiterhin abgeleitet: dort HAT das Kind
           noch keine Rolle, und die Ablage-Stelle ist die einzige Auskunft darüber. */
        tbField[idx].x=finalX;
        tbField[idx].y=finalY;
        taktikRender();
      }
    }
  }

  tok.addEventListener("mousedown",onStart);
  tok.addEventListener("touchstart",onStart,{passive:false});
}


