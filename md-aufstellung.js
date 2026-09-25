/* ═══════════════════════════════════
   BEARBEITBARE AUFSTELLUNG (Spieltag) – manuell änderbar, mit Bank, geteilt speichern
═══════════════════════════════════ */
const KOMBI_POS=[
  {key:"tw",label:"🥅 Torwart",col:"#854d0e"},
  {key:"auf",label:"Aufpasser",col:"#1a56db"},
  {key:"fll",label:"Flitzer L",col:"#b45309"},
  {key:"flr",label:"Flitzer R",col:"#15803d"},
  {key:"jaeg",label:"Jäger",col:"#c2410c"}
];
let kombiLineup={tw:"",auf:"",fll:"",flr:"",jaeg:""};
function initLineupEditor(best){
  // Vom Algorithmus-Vorschlag vorbelegen, sofern noch nichts gesetzt ist
  if(best&&!Object.values(kombiLineup).some(Boolean)){
    kombiLineup={tw:best.tw?best.tw.name:"",auf:best.aufpasser.name,fll:best.flitzer_l.name,flr:best.flitzer_r.name,jaeg:best.jaeger.name};
  }
  renderLineupEditor();
}
function kombiSetPos(key,value){
  // Spieler, der schon woanders steht, dort entfernen (kein Doppel)
  Object.keys(kombiLineup).forEach(k=>{if(k!==key&&kombiLineup[k]===value&&value)kombiLineup[k]="";});
  kombiLineup[key]=value;
  renderLineupEditor();
}
function kombiFromSuggestion(){
  const combos=calcBestCombos(verfuegbareSpieler()); // nie abgesagte Spieler vorschlagen
  if(!combos){toast("Mindestens 4 bewertete Spieler nötig","err");return;}
  const b=combos[0];
  kombiLineup={tw:b.tw?b.tw.name:"",auf:b.aufpasser.name,fll:b.flitzer_l.name,flr:b.flitzer_r.name,jaeg:b.jaeger.name};
  renderLineupEditor();
  toast("Vorschlag übernommen");
}
/* Wer steht zur Auswahl? Die NOMINIERTEN des Spieltags, sonst der aktive Kader – nicht
   `Object.keys(DB)`. Das waren die Namen aus `spielerprofile`; nach dem Saisonstart-Reset
   (v446) ist die Tabelle leer, und damit boten Aufstellung und Bank kein einziges Kind an.
   Die Rollen-EMPFEHLUNG braucht weiterhin Bewertungen und sagt das selbst (renderKombi) –
   aber ein Kind von Hand aufstellen muss auch ohne Bewertung gehen. */
function _lineupNamen(){
  const nom=(typeof nominierteSpieler==="function")?nominierteSpieler():[];
  if(nom&&nom.length)return nom.slice();
  const kad=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).map(k=>k.name);
  return kad.length?kad:Object.keys(DB).sort();
}
function renderLineupEditor(){
  const box=document.getElementById("lineup-editor");
  if(!box)return;
  const names=_lineupNamen();
  const selected=Object.values(kombiLineup).filter(Boolean);
  const bench=names.filter(n=>!selected.includes(n));
  const opts=(cur)=>`<option value="">— frei —</option>`+names.map(n=>`<option value="${esc(n)}"${n===cur?" selected":""}>${esc(n)}${getKader(n)?.nr?" (#"+getKader(n).nr+")":""}${getKader(n)?.tw?" 🥅":""}</option>`).join("");
  const today=new Date().toISOString().slice(0,10);
  box.innerHTML=`
    <div style="font-size:var(--s-klein);font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:8px"><i class="ti ti-clipboard-check"></i> Aufstellung festlegen (Spieltag)</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      ${KOMBI_POS.map(p=>`
        <div style="display:flex;align-items:center;gap:8px">
          <span style="flex:0 0 92px;font-size:var(--s-text);font-weight:600;color:${p.col}">${p.label}</span>
          <select onchange="kombiSetPos('${p.key}',this.value)" style="flex:1;min-height:44px;padding:8px 10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-size:var(--s-text);font-family:inherit;background:var(--surface)">${opts(kombiLineup[p.key])}</select>
        </div>`).join("")}
    </div>
    <div style="font-size:var(--s-klein);font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px"><i class="ti ti-users"></i> Auswechselbank (${bench.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
      ${bench.length?bench.map(n=>`<span style="font-size:var(--s-text);padding:5px 10px;background:var(--surface2);border:var(--border);border-radius:16px">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)}</span>`).join(""):'<span style="font-size:var(--s-klein);color:var(--text3)">Alle Spieler in der Startelf</span>'}
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <input type="date" id="lineup-date" value="${today}" style="min-height:44px;padding:8px 10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit">
      <button class="btn btn-p" onclick="kombiSaveLineup()"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn" onclick="kombiLoadLineup()"><i class="ti ti-cloud-download"></i>Laden</button>
      <button class="btn" onclick="kombiFromSuggestion()"><i class="ti ti-wand"></i>Vorschlag</button>
      <button class="btn" onclick="kombiShareLineup()"><i class="ti ti-share"></i>Teilen</button>
      <button class="btn" onclick="kombiShareLineupBild()"><i class="ti ti-photo"></i>Als Bild</button>
      <button class="btn btn-p" onclick="kombiToMatch()" title="Diese Aufstellung als Startelf ins Live-Match (Rotations-Timer) laden"><i class="ti ti-arrow-right"></i>In Match übernehmen</button>
    </div>`;
}
// HOTFIX 15: geplante Aufstellung (kombiLineup) als Startelf ins Live-Match (Rotations-Timer) laden.
function kombiToMatch(){
  const feld=[kombiLineup.auf,kombiLineup.fll,kombiLineup.flr,kombiLineup.jaeg].filter(Boolean);
  if(!feld.length){toast("Erst die Aufstellung festlegen","err");return;}
  tbFormation="4+1"; // die Raute-Aufstellung ist eine 4+1-Formation
  rotTW=kombiLineup.tw||null;
  rotField=[...feld];
  const squad=_lineupNamen();
  const inLineup=new Set([rotTW,...feld].filter(Boolean));
  rotBench=squad.filter(n=>!inLineup.has(n));
  rotBenchSec={};rotFieldSec={};[...squad,...inLineup].forEach(n=>{rotBenchSec[n]=0;rotFieldSec[n]=0;});
  rotElapsed=0;
  toast("✅ Aufstellung ins Match übernommen");
  if(typeof go==="function")go("spieltag");
  setTimeout(()=>{ if(typeof rotRenderControls==="function")rotRenderControls(); if(typeof rotRenderLive==="function")rotRenderLive(); },120);
}
// Die festgelegte Aufstellung als 4+1-Raute + Bank aufs Canvas zeichnen und teilen
function kombiShareLineupBild(){
  const names=_lineupNamen();
  const selected=Object.values(kombiLineup).filter(Boolean);
  const bench=names.filter(n=>!selected.includes(n));
  const W=600, PITCH=690, BENCH=160, H=PITCH+BENCH;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  // Rasen
  ctx.fillStyle="#2d6a2d";ctx.fillRect(0,0,W,PITCH);
  ctx.strokeStyle="rgba(255,255,255,.4)";ctx.lineWidth=3;
  ctx.strokeRect(16,16,W-32,PITCH-32);
  ctx.beginPath();ctx.arc(W/2,PITCH/2,70,0,Math.PI*2);ctx.stroke();
  // Bank-Streifen
  ctx.fillStyle="#1e293b";ctx.fillRect(0,PITCH,W,BENCH);
  const spots={jaeg:[300,135],fll:[150,285],flr:[450,285],auf:[300,435],tw:[300,585]};
  const col={tw:"#854d0e",auf:"#1a56db",fll:"#b45309",flr:"#15803d",jaeg:"#c2410c"};
  const lbl={tw:"Torwart",auf:"Aufpasser",fll:"Flitzer L",flr:"Flitzer R",jaeg:"Jäger"};
  ctx.textAlign="center";
  KOMBI_POS.forEach(p=>{
    const[x,y]=spots[p.key];
    const name=kombiLineup[p.key];
    // Rollen-Label
    ctx.fillStyle="rgba(255,255,255,.85)";ctx.font="12px Arial";ctx.textBaseline="alphabetic";
    ctx.fillText(lbl[p.key],x,y-26);
    // Pille
    ctx.textBaseline="middle";ctx.font="bold 16px Arial";
    const disp=name||"– offen –";
    const tw=ctx.measureText(disp).width, pillW=Math.max(54,tw+28), pillH=38;
    ctx.fillStyle=name?col[p.key]:"#64748b";
    tbRoundRect(ctx,x-pillW/2,y-pillH/2,pillW,pillH,pillH/2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle="#fff";ctx.fillText(disp,x,y);
  });
  // Bank-Text
  ctx.textAlign="left";ctx.textBaseline="top";
  ctx.fillStyle="rgba(255,255,255,.6)";ctx.font="bold 12px Arial";
  ctx.fillText("AUSWECHSELBANK",24,PITCH+16);
  ctx.fillStyle="#fff";ctx.font="15px Arial";
  const benchStr=bench.length?bench.map(n=>getKader(n)?.nr?getKader(n).nr+" "+n:n).join("   ·   "):"–";
  // Umbruch falls zu lang
  const words=benchStr.split("   ·   ");let line="",yy=PITCH+42;
  words.forEach((w,i)=>{
    const test=line?line+"   ·   "+w:w;
    if(ctx.measureText(test).width>W-48&&line){ctx.fillText(line,24,yy);yy+=24;line=w;}
    else line=test;
  });
  if(line)ctx.fillText(line,24,yy);
  // Titel
  ctx.textAlign="center";ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 20px Arial";ctx.textBaseline="alphabetic";
  ctx.fillText("SV Adler Dellbrück · U9 · 4+1 Raute",W/2,PITCH-14);

  canvas.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"aufstellung-u9.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Aufstellung U9"});}catch(e){}
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aufstellung-u9.png";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Bild heruntergeladen ✓");
    }
  },"image/png");
}
async function kombiSaveLineup(){
  const datum=document.getElementById("lineup-date")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/aufstellungen?on_conflict=datum`,{
      method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum,lineup:kombiLineup})
    });
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Aufstellung gespeichert ✓");try{navigator.vibrate&&navigator.vibrate(50);}catch(e){}}
    else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function kombiLoadLineup(){
  const datum=document.getElementById("lineup-date")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/aufstellungen?datum=eq.${encodeURIComponent(datum)}&select=*`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Fehler beim Laden","err");return;}
    const rows=await r.json();
    if(!rows.length){toast("Keine gespeicherte Aufstellung für dieses Datum","err");return;}
    kombiLineup=Object.assign({tw:"",auf:"",fll:"",flr:"",jaeg:""},rows[0].lineup||{});
    renderLineupEditor();
    toast("Aufstellung geladen ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
function kombiShareLineup(){
  const datum=document.getElementById("lineup-date")?.value||"";
  const posName={tw:"🥅 Torwart",auf:"Aufpasser",fll:"Flitzer L",flr:"Flitzer R",jaeg:"Jäger"};
  const names=_lineupNamen();
  const selected=Object.values(kombiLineup).filter(Boolean);
  const bench=names.filter(n=>!selected.includes(n));
  const zeilen=[`⚽ Aufstellung U9${datum?" · "+datum:""}`,""];
  KOMBI_POS.forEach(p=>{zeilen.push(`${posName[p.key]}: ${kombiLineup[p.key]||"– offen –"}`);});
  zeilen.push("");
  zeilen.push("Bank: "+(bench.length?bench.join(", "):"–"));
  const text=zeilen.join("\n");
  if(navigator.share){navigator.share({title:"Aufstellung U9",text}).catch(()=>{});}
  else{
    const modal=document.createElement("div");
    modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:380px;width:100%">
      <div style="font-weight:700;margin-bottom:8px">Aufstellung teilen</div>
      <textarea readonly style="width:100%;height:180px;font-size:var(--s-text);font-family:monospace;border:1px solid var(--rand-bedien);border-radius:var(--r);padding:8px;resize:none">${esc(text)}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-p" onclick="navigator.clipboard.writeText(this.closest('div[style*=fixed]').querySelector('textarea').value).then(()=>toast('Kopiert ✓'))"><i class="ti ti-copy"></i>Kopieren</button>
        <a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>
        <button class="btn" onclick="this.closest('div[style*=fixed]').remove()">Schließen</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
}

