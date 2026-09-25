/* v617 · Auftakt beim Öffnen: das Adler-Wappen fliegt ein.
   PO: „Ist es möglich, dass beim Öffnen eine Art Animation abläuft, z. B. das Adler-Logo
   einfliegt?"

   Steht als ERSTES im <body> aller drei Einstiege (trainer/, eltern/, kinder/) und läuft
   synchron, also bevor shell.html und Welle 1 geladen sind – die Animation füllt genau die
   Zeit, in der sonst ein leerer Bildschirm stünde. Sie hält nichts auf: pointer-events:none,
   nach rund 3 s (v619, vorher 1,6 s) ist sie aus dem DOM, ein Tipp beendet sie sofort.

   Nicht bei Sonderrouten (Ticker, Heft, Turnier, Quiz, Kind-Link …): wer einen geteilten
   Link öffnet, will sofort den Inhalt. Nur einmal je Sitzung – ein Neuladen zeigt sie nicht
   noch einmal; eine installierte App startet bei jedem Öffnen eine neue Sitzung.
   „Bewegung reduzieren" im System: kein Flug, nur kurz das Wappen.
   Rein schmückend, deshalb aria-hidden. z-index über allen Dialogen (Z_DIALOG_MAX 10069),
   damit der Dialog-Kennzeichner in core.js sie nie für ein Fenster hält. */
(function adlerIntro(){
  try{
    var q=location.search;
    if(/[?&](quiz|ticker|heft|turnier|handover|kind|delegate|match|eltern)(=|&|$)/.test(q))return;
    try{ if(sessionStorage.getItem("adler-intro"))return; sessionStorage.setItem("adler-intro","1"); }catch(e){}
    var ruhig=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var st=document.createElement("style");
    st.id="adler-intro-stil";
    st.textContent=
      "#adler-intro{position:fixed;inset:0;z-index:100000;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;"+
        "background:radial-gradient(circle at 50% 42%,#1a56db 0%,#1e3a8a 62%,#172554 100%);font-family:Inter,system-ui,sans-serif;"+
        "animation:adlerIntroAus .45s ease-in 2.55s forwards}"+
      "#adler-intro .ai-ring{position:relative;width:148px;height:148px;display:flex;align-items:center;justify-content:center}"+
      "#adler-intro .ai-ring:before{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.55);opacity:0;"+
        "animation:adlerIntroRing .9s ease-out 1.05s 2}"+
      "#adler-intro img{width:132px;height:132px;object-fit:cover;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.9);filter:drop-shadow(0 10px 24px rgba(0,0,0,.35));"+
        "animation:adlerIntroFlug 1.15s cubic-bezier(.2,1.25,.45,1) both,adlerIntroAtem 1.3s ease-in-out 1.2s}"+
      "#adler-intro .ai-name{margin-top:18px;color:#fff;font-weight:700;font-size:17px;letter-spacing:.02em;opacity:0;"+
        "animation:adlerIntroText .6s ease-out .9s forwards}"+
      "#adler-intro .ai-name span{display:block;text-align:center;font-weight:600;font-size:13px;opacity:.85;margin-top:2px}"+
      "@keyframes adlerIntroFlug{0%{transform:translate(-46vw,-38vh) rotate(-28deg) scale(.35);opacity:0}"+
        "55%{opacity:1}100%{transform:none;opacity:1}}"+
      "@keyframes adlerIntroRing{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.55);opacity:0}}"+
      "@keyframes adlerIntroAtem{50%{transform:scale(1.06)}}"+
      "@keyframes adlerIntroText{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"+
      "@keyframes adlerIntroAus{to{opacity:0;visibility:hidden}}"+
      "@media (prefers-reduced-motion: reduce){#adler-intro{animation-delay:.6s}"+
        "#adler-intro img,#adler-intro .ai-name{animation:none;opacity:1}#adler-intro .ai-ring:before{animation:none}}";
    document.head.appendChild(st);
    var d=document.createElement("div");
    d.id="adler-intro";
    d.setAttribute("aria-hidden","true");
    d.innerHTML='<div class="ai-ring"><img src="logo.png" alt="" onerror="this.style.visibility=\'hidden\'"></div>'+
      '<div class="ai-name">SV Adler Dellbrück<span>U9</span></div>';
    document.body.insertBefore(d,document.body.firstChild);
    var weg=function(){ d.remove(); st.remove(); document.removeEventListener("pointerdown",weg,true); };
    document.addEventListener("pointerdown",weg,true);          // Tipp beendet sofort
    /* v624: Die Zeit läuft ab dem ersten gemalten Bild, nicht ab dem Skriptstart – auf einem
       langsamen Handy stand sonst ein Teil der drei Sekunden noch vor dem ersten Bild. */
    var los=function(){ setTimeout(weg,ruhig?1000:3100); };   // v619 PO: „relativ kurz … noch ein bisschen verlängern, sodass auch eine Wirkung entsteht“ – 1,6 s → 3 s
    if(window.requestAnimationFrame)requestAnimationFrame(los); else los();
  }catch(e){}
})();
/* Zeigt dem Prüflauf, dass die Datei bis zum Ende gelaufen ist. */
function adlerIntroDa(){ return true; }
