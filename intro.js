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
      /* v629 PO: „Die Animation in der Eltern-App ruckelt etwas.“ Flug und Landen lagen beide als
         transform auf dem Bild; zwei solche Animationen auf einem Element kann der Browser nicht an
         die Grafik abgeben, er rechnet sie dann im Hauptfaden – der in diesen Sekunden die App lädt.
         Deshalb fliegt das Bild, und die Hülle .ai-flug landet bzw. atmet. Der Schimmer wandert
         per transform statt per background-position aus demselben Grund. */
      "#adler-intro .ai-flug{perspective:700px;width:132px;height:132px;border-radius:50%}"+
      "#adler-intro img{will-change:transform,opacity}"+
      "#adler-intro img{width:132px;height:132px;object-fit:cover;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.9);filter:drop-shadow(0 10px 24px rgba(0,0,0,.35))}"+
      /* Trainer: Schuss */
      "#adler-intro.ai-schuss img{animation:adlerIntroFlugSchuss 1.2s cubic-bezier(.15,.7,.3,1) both}#adler-intro.ai-schuss .ai-flug{animation:adlerIntroAtem 1.3s ease-in-out 1.25s}"+
      "@keyframes adlerIntroFlugSchuss{0%{transform:scale(.05) rotate(-720deg);opacity:0}20%{opacity:1}82%{transform:scale(1.08) rotate(10deg);opacity:1}92%{transform:scale(.98) rotate(-4deg)}100%{transform:none;opacity:1}}"+
      /* Eltern: Münzwurf */
      "#adler-intro.ai-muenze img{animation:adlerIntroFlugMuenze 1.25s cubic-bezier(.25,.8,.35,1) both}#adler-intro.ai-muenze .ai-flug{animation:adlerIntroLanden .4s ease-out 1.25s}"+
      "@keyframes adlerIntroFlugMuenze{0%{transform:translate(-40vw,-30vh) rotateY(0deg) scale(.3);opacity:0}15%{opacity:1}"+
        "55%{transform:translate(-12vw,-22vh) rotateY(500deg) scale(.85)}100%{transform:translate(0,0) rotateY(720deg) scale(1);opacity:1}}"+
      "@keyframes adlerIntroLanden{0%{transform:translateY(0) scale(1)}40%{transform:translateY(7px) scale(.96,1.03)}100%{transform:none}}"+
      "#adler-intro .ai-glanz{position:absolute;left:8px;top:8px;width:132px;height:132px;border-radius:50%;pointer-events:none;opacity:0;overflow:hidden}"+
      "#adler-intro .ai-glanz:after{content:'';position:absolute;top:0;bottom:0;left:0;width:70%;transform:translateX(-110%);"+
        "background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.8) 50%,transparent 100%)}"+
      "#adler-intro.ai-muenze .ai-glanz{animation:adlerIntroGlanz .8s linear 1.5s both}"+
      "#adler-intro.ai-muenze .ai-glanz:after{animation:adlerIntroGlanzZug .8s ease-in-out 1.5s both}"+
      "@keyframes adlerIntroGlanz{0%,90%{opacity:1}100%{opacity:0}}"+
      "@keyframes adlerIntroGlanzZug{from{transform:translateX(-110%)}to{transform:translateX(160%)}}"+
      /* Kinder: Sturzflug mit Federsturm (v654). Charles: die Federn-Idee ist gut, die Animation
         „nicht wirklich spannend“. Jetzt: Nachtstadion mit zwei wandernden Scheinwerfern, das
         Wappen stürzt wie ein Adler von oben herab (das Wort kennen die Kinder aus der Raute:
         Option „Sturzflug“), landet mit einer Druckwelle und einem Lichtblitz – und im Moment
         der Landung explodieren goldene Federn nach allen Seiten, schweben dann pendelnd zu
         Boden, dazwischen funkeln Sterne. Die Federn sind gezeichnet (SVG) statt Emoji, damit
         sie auf jedem Handy gleich aussehen. Regel aus v629 bleibt: je Element höchstens eine
         transform-Animation, nur transform und opacity – das Explodieren liegt auf der Hülle
         .ai-feder, das Schweben auf dem Kind .ai-fi. */
      "#adler-intro.ai-adler{background:linear-gradient(to top,#166534 0%,#15803d 9%,rgba(22,101,52,.55) 13%,rgba(22,101,52,0) 22%),radial-gradient(circle at 50% 40%,#1d4ed8 0%,#1e3a8a 55%,#0b1437 100%)}"+
      "#adler-intro .ai-spot{position:absolute;bottom:-10vh;width:34vw;height:130vh;transform-origin:50% 100%;opacity:0;"+
        "background:linear-gradient(to top,rgba(255,255,255,.28),rgba(255,255,255,0) 80%);clip-path:polygon(38% 100%,62% 100%,100% 0,0 0)}"+
      "#adler-intro .ai-spot-l{left:-6vw;animation:adlerIntroSpotL 2.6s ease-in-out .1s both}"+
      "#adler-intro .ai-spot-r{right:-6vw;animation:adlerIntroSpotR 2.6s ease-in-out .1s both}"+
      "@keyframes adlerIntroSpotL{0%{opacity:0;transform:rotate(-38deg)}20%{opacity:1}60%{transform:rotate(14deg)}100%{opacity:.7;transform:rotate(-6deg)}}"+
      "@keyframes adlerIntroSpotR{0%{opacity:0;transform:rotate(38deg)}20%{opacity:1}60%{transform:rotate(-14deg)}100%{opacity:.7;transform:rotate(6deg)}}"+
      "#adler-intro.ai-adler img{animation:adlerIntroFlugAdler 1.05s cubic-bezier(.55,0,.75,.3) both}"+
      "#adler-intro.ai-adler .ai-flug{animation:adlerIntroLandung .55s cubic-bezier(.2,1.6,.4,1) 1.05s both}"+
      "@keyframes adlerIntroFlugAdler{0%{transform:translate(18vw,-75vh) rotate(-35deg) scale(1.9);opacity:0}"+
        "12%{opacity:1}100%{transform:none;opacity:1}}"+
      "@keyframes adlerIntroLandung{0%{transform:scale(1.18,.84)}45%{transform:scale(.94,1.08)}100%{transform:none}}"+
      "#adler-intro.ai-adler .ai-ring:before{animation:adlerIntroRing .8s ease-out 1.02s 2;border-color:#fde68a}"+
      "#adler-intro .ai-blitz{position:absolute;left:50%;top:50%;width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;opacity:0;"+
        "background:radial-gradient(circle,rgba(255,244,200,.95) 0%,rgba(253,224,71,.45) 35%,rgba(253,224,71,0) 70%);animation:adlerIntroBlitz .7s ease-out 1.02s both}"+
      "@keyframes adlerIntroBlitz{0%{opacity:0;transform:scale(.3)}25%{opacity:1}100%{opacity:0;transform:scale(1.6)}}"+
      "#adler-intro .ai-feder{position:absolute;left:50%;top:50%;width:0;height:0;opacity:0;"+
        "animation:adlerIntroFederBurst .75s cubic-bezier(.12,.85,.3,1) 1.03s both}"+
      "@keyframes adlerIntroFederBurst{0%{opacity:0;transform:translate(0,0) rotate(0deg) scale(.2)}12%{opacity:1}"+
        "100%{opacity:1;transform:translate(var(--dx),var(--dy)) rotate(var(--dr)) scale(1)}}"+
      "#adler-intro .ai-fi{display:block;width:30px;height:88px;margin:-44px 0 0 -15px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));animation:adlerIntroFederFall 1.3s ease-in 1.75s both}"+
      "@keyframes adlerIntroFederFall{0%{transform:none;opacity:1}30%{transform:translate(12px,6vh) rotate(22deg)}"+
        "65%{transform:translate(-10px,13vh) rotate(-18deg);opacity:1}100%{transform:translate(6px,22vh) rotate(10deg);opacity:0}}"+
      "#adler-intro .ai-stern{position:absolute;color:#fde68a;font-size:18px;opacity:0;animation:adlerIntroStern .9s ease-out both}"+
      "@keyframes adlerIntroStern{0%{opacity:0;transform:scale(.2) rotate(0deg)}40%{opacity:1;transform:scale(1.3) rotate(90deg)}100%{opacity:0;transform:scale(.4) rotate(180deg)}}"+
      "#adler-intro.ai-adler .ai-name{font-size:20px;font-weight:900;animation:adlerIntroRuf .55s cubic-bezier(.2,1.6,.4,1) 1.45s both}"+
      "@keyframes adlerIntroRuf{0%{opacity:0;transform:scale(.4)}100%{opacity:1;transform:none}}"+
      "#adler-intro .ai-name{margin-top:18px;color:#fff;font-weight:700;font-size:17px;letter-spacing:.02em;opacity:0;"+
        "animation:adlerIntroText .6s ease-out .9s forwards}"+
      "#adler-intro .ai-name span{display:block;text-align:center;font-weight:600;font-size:13px;opacity:.85;margin-top:2px}"+

      "@keyframes adlerIntroRing{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.55);opacity:0}}"+
      "@keyframes adlerIntroAtem{50%{transform:scale(1.06)}}"+
      "@keyframes adlerIntroText{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"+
      "@keyframes adlerIntroAus{to{opacity:0}}"+
      "@media (prefers-reduced-motion: reduce){#adler-intro{animation-delay:.6s}"+
        "#adler-intro img,#adler-intro .ai-name{animation:none!important;opacity:1}#adler-intro .ai-flug,#adler-intro .ai-ring:before,#adler-intro .ai-glanz,#adler-intro .ai-glanz:after{animation:none!important}#adler-intro .ai-feder,#adler-intro .ai-spot,#adler-intro .ai-blitz,#adler-intro .ai-stern{display:none}}";
    document.head.appendChild(st);
    var d=document.createElement("div");
    d.id="adler-intro";
    d.className="ai-"+art;
    d.setAttribute("aria-hidden","true");
    var federn="", extra="";
    if(art==="adler"){
      /* 14 Federn im Kreis, jede etwas anders weit und gedreht – so wirkt es wie ein Aufprall. */
      var feder='<svg class="ai-fi" viewBox="0 0 20 64" aria-hidden="true"><defs><linearGradient id="aiFg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>'+
        '<g fill="url(#aiFg)"><path d="M10 4 C5 10 3 19 3.5 28 L10 30 Z"/><path d="M10 32 L3.8 30.5 C3.8 39 6 45 10 50 Z"/>'+
        '<path d="M10 4 C14.5 11 16.5 19 16 26 L10 28 Z"/><path d="M10 30 L16.2 28.5 C16 37 13.8 44 10 50 Z"/></g>'+
        '<g stroke="#b45309" stroke-opacity=".35" stroke-width=".6"><path d="M10 12 L5 9 M10 20 L4.5 17 M10 38 L5 35 M10 44 L6.5 42 M10 12 L14.5 9 M10 19 L15.5 16 M10 37 L15 34 M10 43 L13.5 41"/></g>'+
        '<path d="M10 3 L10 62" stroke="#78350f" stroke-width="1.3" stroke-linecap="round"/></svg>';
      for(var i=0;i<14;i++){
        var w=i/14*Math.PI*2+(i%2?0.15:-0.1), r=(i%3===0?150:i%3===1?115:185);
        federn+='<span class="ai-feder" style="--dx:'+Math.round(Math.cos(w)*r)+'px;--dy:'+Math.round(Math.sin(w)*r*0.9-20)+'px;--dr:'+(Math.round(w*57)+90+(i%2?40:-40))+'deg;animation-delay:'+(1.03+(i%4)*0.03).toFixed(2)+'s">'+feder+'</span>';
      }
      [[14,22,.3],[82,18,.6],[24,70,1.2],[76,66,1.35],[50,12,1.6],[10,48,1.8],[90,44,1.9],[60,80,2.05]].forEach(function(p){
        extra+='<span class="ai-stern" style="left:'+p[0]+'vw;top:'+p[1]+'vh;animation-delay:'+p[2]+'s">✦</span>';
      });
      extra='<div class="ai-spot ai-spot-l"></div><div class="ai-spot ai-spot-r"></div>'+extra;
    }
    d.innerHTML=extra+'<div class="ai-ring">'+(art==="adler"?'<div class="ai-blitz"></div>':'')+'<div class="ai-flug"><img src="logo.png" alt="" onerror="this.style.visibility=\'hidden\'"></div>'+(art==="muenze"?'<div class="ai-glanz"></div>':'')+federn+'</div>'+
      '<div class="ai-name">'+(art==="adler"?'Willkommen in der Kabine!<span>SV Adler Dellbrück · U9</span>':'SV Adler Dellbrück<span>'+(art==="muenze"?"Eltern":"U9")+'</span>')+'</div>';
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
