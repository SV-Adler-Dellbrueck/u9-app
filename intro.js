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
    /* v626 PO: „Kann sich das Logo auch drehen und reinfliegen … oder andere Ideen, die es
       einzigartig machen?“ – Kachel: „alle drei Varianten für die drei Apps“. Jede App erkennt
       man am Auftakt: Trainer = Schuss (wächst aus der Tiefe, zwei Umdrehungen), Eltern = Münzwurf
       (Bogenflug, zweimal um die Hochachse wie bei der Seitenwahl, dann ein Lichtschimmer),
       Kinder = Adlerflug (Gleitflug in der Kurve, es rieseln Federn – die Punkte der Kabine). */
    var pfad=location.pathname;
    var art=/\/kinder\//.test(pfad)?"adler":(/\/eltern\//.test(pfad)?"muenze":"schuss");
    var st=document.createElement("style");
    st.id="adler-intro-stil";
    st.textContent=
      "#adler-intro{position:fixed;inset:0;z-index:100000;pointer-events:none;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;"+
        "background:radial-gradient(circle at 50% 42%,#1a56db 0%,#1e3a8a 62%,#172554 100%);font-family:Inter,system-ui,sans-serif;"+
        "animation:adlerIntroAus .45s ease-in 2.55s forwards}"+
      "#adler-intro .ai-ring{position:relative;width:148px;height:148px;display:flex;align-items:center;justify-content:center}"+
      "#adler-intro .ai-ring:before{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.55);opacity:0;"+
        "animation:adlerIntroRing .9s ease-out 1.05s 2}"+
      "#adler-intro .ai-ring{perspective:700px}"+
      "#adler-intro img{width:132px;height:132px;object-fit:cover;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.9);filter:drop-shadow(0 10px 24px rgba(0,0,0,.35))}"+
      /* Trainer: Schuss */
      "#adler-intro.ai-schuss img{animation:adlerIntroFlugSchuss 1.2s cubic-bezier(.15,.7,.3,1) both,adlerIntroAtem 1.3s ease-in-out 1.25s}"+
      "@keyframes adlerIntroFlugSchuss{0%{transform:scale(.05) rotate(-720deg);opacity:0}20%{opacity:1}82%{transform:scale(1.08) rotate(10deg);opacity:1}92%{transform:scale(.98) rotate(-4deg)}100%{transform:none;opacity:1}}"+
      /* Eltern: Münzwurf */
      "#adler-intro.ai-muenze img{animation:adlerIntroFlugMuenze 1.25s cubic-bezier(.25,.8,.35,1) both,adlerIntroLanden .4s ease-out 1.25s}"+
      "@keyframes adlerIntroFlugMuenze{0%{transform:translate(-40vw,-30vh) rotateY(0deg) scale(.3);opacity:0}15%{opacity:1}"+
        "55%{transform:translate(-12vw,-22vh) rotateY(500deg) scale(.85)}100%{transform:translate(0,0) rotateY(720deg) scale(1);opacity:1}}"+
      "@keyframes adlerIntroLanden{0%{transform:translateY(0) scale(1)}40%{transform:translateY(7px) scale(.96,1.03)}100%{transform:none}}"+
      "#adler-intro .ai-glanz{position:absolute;left:8px;top:8px;width:132px;height:132px;border-radius:50%;pointer-events:none;opacity:0;"+
        "background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.8) 50%,transparent 65%);background-size:260% 100%;background-position:160% 0}"+
      "#adler-intro.ai-muenze .ai-glanz{animation:adlerIntroGlanz .8s ease-in-out 1.5s both}"+
      "@keyframes adlerIntroGlanz{0%{opacity:1;background-position:160% 0}100%{opacity:1;background-position:-60% 0}}"+
      /* Kinder: Adlerflug mit Federn */
      "#adler-intro.ai-adler img{animation:adlerIntroFlugAdler 1.35s cubic-bezier(.3,.7,.35,1) both,adlerIntroAtem 1.3s ease-in-out 1.4s}"+
      "@keyframes adlerIntroFlugAdler{0%{transform:translate(-62vw,12vh) rotate(-200deg) scale(.4);opacity:0}15%{opacity:1}"+
        "50%{transform:translate(-16vw,-16vh) rotate(-60deg) scale(.8)}80%{transform:translate(5vw,3vh) rotate(12deg) scale(1.03)}100%{transform:none;opacity:1}}"+
      "#adler-intro .ai-feder{position:absolute;top:-8vh;font-size:26px;opacity:0;animation:adlerIntroFeder 1.9s ease-in forwards}"+
      "@keyframes adlerIntroFeder{0%{opacity:0;transform:translate(0,0) rotate(-20deg)}15%{opacity:.95}"+
        "50%{transform:translate(18px,45vh) rotate(25deg)}100%{opacity:0;transform:translate(-14px,95vh) rotate(-30deg)}}"+
      "#adler-intro .ai-name{margin-top:18px;color:#fff;font-weight:700;font-size:17px;letter-spacing:.02em;opacity:0;"+
        "animation:adlerIntroText .6s ease-out .9s forwards}"+
      "#adler-intro .ai-name span{display:block;text-align:center;font-weight:600;font-size:13px;opacity:.85;margin-top:2px}"+

      "@keyframes adlerIntroRing{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.55);opacity:0}}"+
      "@keyframes adlerIntroAtem{50%{transform:scale(1.06)}}"+
      "@keyframes adlerIntroText{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"+
      "@keyframes adlerIntroAus{to{opacity:0;visibility:hidden}}"+
      "@media (prefers-reduced-motion: reduce){#adler-intro{animation-delay:.6s}"+
        "#adler-intro img,#adler-intro .ai-name{animation:none!important;opacity:1}#adler-intro .ai-ring:before,#adler-intro .ai-glanz{animation:none!important}#adler-intro .ai-feder{display:none}}";
    document.head.appendChild(st);
    var d=document.createElement("div");
    d.id="adler-intro";
    d.className="ai-"+art;
    d.setAttribute("aria-hidden","true");
    var federn="";
    if(art==="adler")[8,22,37,52,66,80,93].forEach(function(x,i){ federn+='<span class="ai-feder" style="left:'+x+'vw;animation-delay:'+(0.35+i*0.13).toFixed(2)+'s">🪶</span>'; });
    d.innerHTML=federn+'<div class="ai-ring"><img src="logo.png" alt="" onerror="this.style.visibility=\'hidden\'">'+(art==="muenze"?'<div class="ai-glanz"></div>':'')+'</div>'+
      '<div class="ai-name">SV Adler Dellbrück<span>'+(art==="adler"?"Kabine":art==="muenze"?"Eltern":"U9")+'</span></div>';
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
