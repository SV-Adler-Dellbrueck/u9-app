/* ═══════════════════════════════════
   TAKTIK-BIBLIOTHEK (Welle 1, FEAT AB)
   "Übung speichern" sichert den kompletten Board-Zustand als Template
   in taktik_templates (Trainer-only RLS): Formation, Token-Positionen
   (bereits in Feld-%), Ball und gezeichnete Strokes. Strokes werden
   beim Speichern auf 0..1 normalisiert UND ausgedünnt (jeder 3. Punkt,
   4 Nachkommastellen) -> wenige KB pro Template, kein JSONB-Ballast.
═══════════════════════════════════ */
function ttSnapshot(){
  const cv=document.getElementById("tb-draw");
  const w=(cv&&cv.width)||1, h=(cv&&cv.height)||1;
  const strokes=(dwStrokes||[]).filter(s=>s.points&&s.points.length>1).map(s=>({
    mode:s.mode,
    points:s.points.filter((_,i)=>i%3===0||i===s.points.length-1).map(p=>[+(p.x/w).toFixed(4),+(p.y/h).toFixed(4)])
  }));
  return {
    formation:tbFormation,
    field:tbField.map(p=>({name:p.name,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,cls:p.cls,role:p.role})),
    ball:{x:Math.round(tbBall.x*10)/10,y:Math.round(tbBall.y*10)/10},
    strokes
  };
}
async function ttSave(){
  if(!tbField||!tbField.length){toast("Erst eine Aufstellung aufs Feld stellen","err");return;}
  const name=(prompt("Name der Übung / Spielsituation:","")||"").trim();
  if(!name)return;
  const snap=ttSnapshot();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({name,formation:snap.formation,data:snap})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("💾 In Bibliothek gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function ttOpen(){
  document.getElementById("tt-modal")?.remove();
  const m=document.createElement("div");m.id="tt-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("tt-modal","📚","Taktik-Bibliothek","Gespeicherte Aufstellungen & Übungen laden","#2563eb")}
    <div id="tt-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  ttRender();
}
async function ttRender(){
  const body=document.getElementById("tt-body"); if(!body)return;
  let items=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?select=id,name,formation,created_at&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)items=(await r.json())||[];
  }catch(e){}
  if(!items.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Noch keine Übungen gespeichert.<br>Board einrichten → „💾 Übung" drücken.</div>';return;}
  body.innerHTML=items.map(t=>`
    <div style="display:flex;align-items:center;gap:8px;padding:10px;border:var(--border-s);border-radius:12px;margin-bottom:8px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${t.formation?esc(t.formation)+" · ":""}${new Date(t.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
      </div>
      ${t.formation==="KI-Übung"
        ?`<button class="btn btn-sm" onclick="ttViewKi(${t.id})"><i class="ti ti-eye"></i>Ansehen</button>`
        :`<button class="btn btn-p btn-sm" onclick="ttLoad(${t.id})">Laden</button>`}
      <button onclick="ttDelete(${t.id})" title="Löschen" style="min-width:40px;min-height:40px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);cursor:pointer">🗑</button>
    </div>`).join("");
}
async function ttLoad(id){
  let row=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${id}&select=data`,{headers:sbAuthHeaders()});
    if(r.ok)row=((await r.json())||[])[0];
  }catch(e){}
  if(!row||!row.data){toast("Übung konnte nicht geladen werden","err");return;}
  const d=row.data;
  // Formation + Tokens direkt setzen (KEIN taktikSetup - das würde neu auto-befüllen)
  if(d.formation&&FORMATIONS[d.formation]){
    tbFormation=d.formation;
    document.querySelectorAll(".tb-form-btn").forEach(b=>b.classList.toggle("btn-p",b.dataset.form===d.formation));
  }
  tbField=(d.field||[]).map(p=>({...p}));
  const used=new Set(tbField.map(f=>f.name));
  tbBench=kaderNamen().filter(n=>!used.has(n));
  tbBall=d.ball?{...d.ball}:{x:50,y:50};
  taktikRender();
  // Strokes: Zeichenmodus aktivieren, Canvas dimensionieren, dann 0..1 -> Pixel
  if(d.strokes&&d.strokes.length){
    if(!dwOn)dwToggle();
    dwResize();
    const cv=document.getElementById("tb-draw");
    const w=(cv&&cv.width)||1, h=(cv&&cv.height)||1;
    dwStrokes=d.strokes.map(s=>({mode:s.mode,points:s.points.map(p=>({x:p[0]*w,y:p[1]*h}))}));
    dwRedraw();
  }else{
    dwStrokes=[];
    if(dwOn)dwRedraw();
  }
  document.getElementById("tt-modal")?.remove();
  toast("Übung aufs Board geladen ✓");
}
async function ttDelete(id){
  if(!confirm("Übung wirklich löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Löschen fehlgeschlagen","err");return;}
    ttRender();
  }catch(e){}
}

