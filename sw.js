const CACHE="u9i-adler-v751";
const PRECACHE=[
  "./",
  "./index.html",
  "./trainer/",          // Einstiegsseite der Trainer-App (eigener Manifest-Scope)
  "./eltern/",           // Einstiegsseite des Eltern-Bereichs
  "./kinder/",           // Einstiegsseite der Kabine auf dem Geraet des Kindes
  "./intro.js",          // Auftakt beim Öffnen (v617), steht vor allem anderen im <body>
  "./shell.html",        // gemeinsames Seitengeruest aller drei Einstiegsseiten
  "./styles.css",
  "./data.js",
  "./core.js",
  "./engine.js",
  "./views.js",
  "./quiz.js",
  "./md-eltern-portal.js",
  "./vendor/qrcode.js",   // v604: QR-Codes fuer Einladungskarten und Aushang, erst beim Drucken geladen
  "./md-abzeichen.js",
  "./md-carpool.js",
  "./md-fanfakten.js",
  "./md-teamkasse.js",
  "./md-kabine.js",
  "./md-aufstellung.js",
  "./md-print.js",
  "./md-taktikboard.js",
  "./md-taktik-video.js",
  "./md-kalender.js",
  "./md-gegner.js",
  "./md-turnierplan.js",
  "./md-teams.js",
  "./md-matchuhr.js",
  "./md-liveticker.js",
  "./md-spielbericht.js",
  "./md-matchcard.js",
  "./md-analyse.js",
  "./md-quests.js",
  "./md-voice.js",
  "./md-wissen.js",
  "./md-fazit.js",
  "./md-tagebuch.js",
  "./md-live-vollbild.js",
  "./md-fundbuero.js",
  "./md-ausruestung.js",
  "./md-galerie.js",
  "./md-nest.js",   // v733: Adler Nest als Ausgaben (Leseansicht + Editor)
  "./md-kasse.js",
  "./md-ki-coach.js",
  "./md-einheit-import.js",
  "./md-block.js",
  "./md-skizze.js",
  "./md-brett.js",
  "./md-kindtraining.js",
  "./md-adler-rufe.js",   // v670: Adler-Rufe (Team-Chat)
  "./boot.js",
  "./logo.png",
  "./badge-adler.png",   // v671: Adler weiß auf transparent – Symbol in der Statusleiste bei Push
  "./icon-trainer.png",
  "./icon-trainer-maskable.png",
  "./icon-eltern.png",
  "./icon-eltern-maskable.png",
  "./icon-kinder.png",
  "./icon-kinder-maskable.png",
  "./manifest-trainer.json",
  "./manifest-eltern.json",
  "./manifest-kinder.json",
  /* v642: Schrift, Icons und Chart.js liegen im Repo. Vorher kamen sie von Google Fonts und
     jsDelivr – jeder Start der App hat dort die IP-Adresse von Eltern und Kindern hinterlassen.
     Die Schriftdateien stehen einzeln hier, damit auch der erste Start ohne Netz Schrift hat. */
  "./vendor/inter.css",
  "./vendor/tabler-icons.min.css",
  "./vendor/barlow.css",   // v733: Heftschrift des Adler Nest, lokal statt Google
  "./vendor/fonts/barlow-regular.woff2",
  "./vendor/fonts/barlow-semibold.woff2",
  "./vendor/fonts/barlow-bold.woff2",
  "./vendor/fonts/barlow-condensed-semibold.woff2",
  "./vendor/fonts/barlow-condensed-extrabold.woff2",
  "./vendor/fonts/tabler-icons.woff2",
  "./vendor/fonts/inter-latin-400-normal.woff2",
  "./vendor/fonts/inter-latin-ext-400-normal.woff2",
  "./vendor/fonts/inter-latin-500-normal.woff2",
  "./vendor/fonts/inter-latin-ext-500-normal.woff2",
  "./vendor/fonts/inter-latin-600-normal.woff2",
  "./vendor/fonts/inter-latin-ext-600-normal.woff2",
  "./vendor/fonts/inter-latin-700-normal.woff2",
  "./vendor/fonts/inter-latin-ext-700-normal.woff2",
  "./vendor/chart.umd.js"
];

self.addEventListener("install",e=>{
  // cache:"reload" umgeht den HTTP-Cache des Browsers. Ohne das kann der Precache eine
  // Datei aus dem Browser-Cache uebernehmen (GitHub Pages liefert HTML mit max-age=600)
  // und der neue Service Worker startet mit einer veralteten index.html.
  /* v655: Datei für Datei statt addAll. addAll ist alles oder nichts – scheitert eine
     einzige Datei (Netz wackelt, Speicher knapp), bleibt das Gerät still auf der alten
     Version stehen, Tag für Tag. Jetzt reicht es, wenn die Seiten und der Kern da sind;
     was fehlt, holt die App beim ersten Gebrauch aus dem Netz nach (siehe fetch). */
  const PFLICHT=["./trainer/","./eltern/","./kinder/","./core.js","./boot.js","./views.js"];
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    const erg=await Promise.allSettled(PRECACHE.map(u=>c.add(new Request(u,{cache:"reload"})).then(()=>u)));
    const da=new Set(erg.filter(x=>x.status==="fulfilled").map(x=>x.value));
    const fehlt=PFLICHT.filter(u=>PRECACHE.includes(u)&&!da.has(u));
    if(fehlt.length){
      // Lieber beim alten bleiben – und den halben Cache wieder weg, sonst meldet die
      // Versionsanzeige (liest den höchsten Cache-Namen) eine Version, die nie lief.
      await caches.delete(CACHE);
      throw new Error("Precache unvollständig: "+fehlt.join(", "));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

// Welche Einstiegsseite gehoert zu dieser Navigation? (Cache-Schluessel + Offline-Fallback)
function einstiegFuer(url){
  const pfad=new URL(url).pathname;
  if(pfad.includes("/eltern/"))return "./eltern/";
  if(pfad.includes("/kinder/"))return "./kinder/";
  if(pfad.includes("/trainer/"))return "./trainer/";
  return "./index.html"; // die Weiche in der Wurzel
}

self.addEventListener("fetch",e=>{
  const url=e.request.url;
  if(url.includes("supabase.co"))return;
  if(url.includes("open-meteo.com"))return; // Wetter: nie cachen (ignoreSearch würde die Datums-Query zerstören)
  if(url.includes("openstreetmap.org"))return; // Geocoding/Adress-Suche: nie cachen (Query-Sicherheit)
  if(url.includes("openholidaysapi.org"))return; // Ferien-Radar: nie cachen (ignoreSearch würde die Datums-Query zerstören)
  /* v512/v513: Alles unter uebungen/ ist Quelle fuer den Abgleich beim Oeffnen –
     bibliothek.json (Uebungen) und vorlagen.json (Vorlagen). Aus dem Cache gelesen
     bliebe eine solche Datei fuer immer auf dem Stand der Installation stehen, und weil
     hier mit ignoreSearch gematcht wird, hilft auch kein ?cb=… an der URL. Deshalb: nie
     cachen, immer direkt aus dem Netz (offline schlaegt der Abruf fehl, der Abgleich tut
     dann still nichts). Bewusst der ganze ORDNER: eine dritte Datei ist damit von selbst
     dabei – bei zwei Einzelregeln waere sie irgendwann vergessen, und das faellt nicht
     auf. Keine dieser Dateien gehoert in den PRECACHE. */
  if(/\/uebungen\/[^/]+\.json$/.test(url))return;
  if(e.request.method!=="GET")return;

  /* NETWORK-FIRST fuer die Seite selbst und die Manifeste.
     Vorher galt auch hier cache-first: die HTML-Seite kam aus dem Cache und hing damit
     strukturell eine Version hinterher. Fatal beim Installieren – Chrome liest das
     Manifest aus dem gelieferten HTML, bekam die ALTE Seite (ohne die Manifest-Umschaltung
     im <head>) und hat den Eltern-Zugang als Trainer-App installiert.
     Offline faellt beides sauber auf den Cache zurueck. */
  const istSeite = e.request.mode==="navigate";
  const istManifest = /manifest-[a-z]+\.json$/.test(url);
  if(istSeite||istManifest){
    // Jede App hat ihre eigene Einstiegsseite; ?portal/?quiz/?heft sind dieselbe Datei.
    const seitenKey = istSeite ? einstiegFuer(url) : e.request;
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request);
        if(net&&net.ok){
          // Klon SOFORT ziehen: nach dem return ist der Body angezapft und clone() scheitert
          const kopie=net.clone();
          caches.open(CACHE).then(c=>c.put(seitenKey,kopie)).catch(()=>{});
        }
        return net;
      }catch(err){
        const cached=await caches.match(seitenKey,{ignoreSearch:istSeite});
        return cached||new Response("Offline",{status:503,statusText:"Offline"});
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    // ignoreSearch: "./?quiz" matcht den Precache von "./"
    const cached=await caches.match(e.request,{ignoreSearch:true});
    const fetchPromise=fetch(e.request).then(res=>{
      if(res.ok){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>null);

    if(cached)return cached;
    const net=await fetchPromise;
    if(net)return net;

    // Offline-Fallback fuer Navigationen: immer die App-Shell liefern
    if(e.request.mode==="navigate"){
      const shell=await caches.match("./index.html",{ignoreSearch:true});
      if(shell)return shell;
    }
    return new Response("Offline",{status:503,statusText:"Offline"});
  })());
});

// ── Web-Push: eingehende Benachrichtigung anzeigen ──
self.addEventListener("push",e=>{
  let d={};
  try{ d=e.data?e.data.json():{}; }catch(_){ try{d={body:e.data.text()};}catch(__){} }
  const title=d.title||"SV Adler Dellbrück U9";
  const opts={
    body:d.body||"", icon:"./logo.png", badge:"./badge-adler.png",
    data:{url:d.url||"./"}, tag:d.tag||"adler", renotify:true,
    vibrate:[40,60,40]
  };
  e.waitUntil(self.registration.showNotification(title,opts));
});
/* v696 PO 30.09.: „Wenn ich oben drauf klicke, öffnet sich die Trainer-App – obwohl ich die
   Benachrichtigung in der Eltern-App angefordert habe.“ Der Klick nahm das ERSTE offene Fenster,
   egal welcher App, und lud das Ziel darin. Jetzt bestimmt das Ziel die App (Ordner trainer/,
   eltern/, kinder/ – bei der Weiche im Wurzelverzeichnis nach denselben Regeln wie index.html),
   und nur ein Fenster DIESER App wird wiederverwendet; sonst öffnet ein neues. */
const ELTERN_ROUTEN=["portal","quiz","heft","ticker","kind","delegate","match","eltern","rsvp","handover","turnier","einladung"];
function _zielOrdner(href){
  try{
    const u=new URL(href);
    const m=u.pathname.match(/\/(trainer|eltern|kinder)\//);
    if(m)return m[1];
    if(u.searchParams.has("kinder"))return "kinder";
    if(ELTERN_ROUTEN.some(k=>u.searchParams.has(k)))return "eltern";
    return "trainer";   // die Weiche schickt alles Übrige in die Trainer-App
  }catch(_){ return null; }
}
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const ziel=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  const ordner=_zielOrdner(ziel);
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    const passend=cs.find(c=>ordner?String(c.url).includes("/"+ordner+"/"):true);
    if(!passend||!("focus" in passend))return clients.openWindow(ziel);
    /* v697: Ist die App offen, erst fragen, ob sie das Ziel selbst öffnen kann (Adler-Rufe:
       direkt ins Gespräch, ohne Neuladen). Antwortet sie nicht binnen 1,5 s – etwa eine alte
       Fassung ohne Empfänger –, wird sie wie bisher auf das Ziel umgeleitet. */
    return passend.focus().catch(()=>passend).then(()=>_fensterFragen(passend,ziel)).then(ok=>{
      if(ok)return;
      return Promise.resolve().then(()=>passend.navigate(ziel)).catch(()=>clients.openWindow(ziel));
    });
  }));
});
function _fensterFragen(c,ziel){
  return new Promise(fertig=>{
    let erledigt=false, kanal=null;
    // v699: den Kanal schließen, sobald die Antwort da ist oder die Zeit um ist – sonst bleibt er offen
    const ende=v=>{ if(!erledigt){ erledigt=true; try{ kanal&&kanal.port1.close(); }catch(_){} fertig(v); } };
    try{ kanal=new MessageChannel(); kanal.port1.onmessage=ev=>ende(!!(ev.data&&ev.data.ok));
      c.postMessage({art:"push-ziel",url:ziel},[kanal.port2]); }catch(_){ ende(false); return; }
    setTimeout(()=>ende(false),1500);
  });
}
