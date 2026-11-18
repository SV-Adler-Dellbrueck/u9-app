/* ═══════════════════════════════════
   PRINT / PDF FUNCTION
═══════════════════════════════════ */
/* In-App-Druckvorschau (PO-Wunsch): zeigt den Inhalt wie auf Papier, BEVOR der
   System-Druckdialog aufgeht (in der installierten PWA landet man sonst direkt im
   Drucker-/Share-Dialog). Buttons/Filter/Eingaben sind ausgeblendet wie im Print-CSS;
   Canvas-Grafiken (Radar) werden als Bild übernommen, sonst wären sie in der Kopie leer. */
function printView(viewName){
  const target=document.getElementById("view-"+viewName);
  if(!target){_printNow(viewName);return;}
  document.getElementById("print-prev-modal")?.remove();
  const modal=document.createElement("div"); modal.id="print-prev-modal";
  modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Druck-Vorschau");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10060;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:760px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const clone=target.cloneNode(true);
  clone.classList.remove("view","active"); clone.removeAttribute("id"); clone.style.display="block";
  clone.querySelectorAll("button,.frow,.brow,input,select,textarea").forEach(el=>{el.style.display="none";});
  const src=target.querySelectorAll("canvas"), dst=clone.querySelectorAll("canvas");
  dst.forEach((cv,i)=>{ try{const img=document.createElement("img");img.src=src[i].toDataURL();img.style.cssText="max-width:100%";cv.replaceWith(img);}catch(e){cv.remove();} });
  c.innerHTML=`${(typeof mdlHead==="function")?mdlHead("print-prev-modal","🖨️","Druck-Vorschau","So kommt es aufs Papier – Buttons & Eingaben sind ausgeblendet","#334155"):""}
    <button class="btn btn-p" style="width:100%;min-height:48px;margin-bottom:12px" onclick="document.getElementById('print-prev-modal').remove();_printNow('${viewName}')"><i class="ti ti-printer"></i>Jetzt drucken / als PDF</button>
    <div style="border:1px dashed #cbd5e1;border-radius:10px;padding:12px;background:#fff;color:#0f172a;overflow-x:auto;pointer-events:none"></div>`;
  c.lastElementChild.appendChild(clone);
  modal.appendChild(c); document.body.appendChild(modal);
}
function _printNow(viewName){
  // Mark correct view as print-active
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("print-active"));
  const target=document.getElementById("view-"+viewName);
  if(target) target.classList.add("print-active");

  // Titel-Datum für den Druck-Kopf (Kopf-Elemente werden unten in target eingefügt)
  const now=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});

  let subtitle="";
  if(viewName==="profil"){
    const sel=document.getElementById("psel-profil");
    subtitle=sel?.value?" – "+sel.value:"";
  } else if(viewName==="verlauf"){
    const sel=document.getElementById("psel-verlauf");
    subtitle=sel?.value?" – Entwicklung "+sel.value:"";
  } else if(viewName==="kader"){
    subtitle=" – Kaderübersicht";
  }

  // Add temporary header elements
  if(target){
    const h=document.createElement("h1");
    h.className="print-header";
    h.textContent="Spielerprofil U9 I – SV Adler Dellbrück"+subtitle;
    const meta=document.createElement("div");
    meta.className="print-meta";
    meta.textContent="Stand: "+now+" · "+TRAINER.join(", ")+" · 4+1 Raute";
    target.insertBefore(meta,target.firstChild);
    target.insertBefore(h,target.firstChild);
  }

  // Expand all collapsed dim blocks for printing
  document.querySelectorAll(".dim-body.coll").forEach(b=>{
    b.classList.add("_was_coll");
    b.classList.remove("coll");
  });

  window.print();

  // Restore after print
  setTimeout(()=>{
    document.querySelectorAll(".dim-body._was_coll").forEach(b=>{
      b.classList.add("coll");
      b.classList.remove("_was_coll");
    });
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("print-active"));
    const tmpH=target?.querySelector(".print-header");
    const tmpM=target?.querySelector(".print-meta");
    if(tmpH)tmpH.remove();
    if(tmpM)tmpM.remove();
  }, 1000);
}

