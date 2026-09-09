const CACHE="u9i-adler-v489";
const PRECACHE=[
  "./",
  "./index.html",
  "./trainer/",          // Einstiegsseite der Trainer-App (eigener Manifest-Scope)
  "./eltern/",           // Einstiegsseite des Eltern-Bereichs
  "./shell.html",        // gemeinsames Seitengeruest beider Einstiegsseiten
  "./styles.css",
  "./data.js",
  "./core.js",
  "./engine.js",
  "./views.js",
  "./quiz.js",
  "./md-eltern-portal.js",
  "./md-abzeichen.js",
  "./md-carpool.js",
  "./md-fanfakten.js",
  "./md-teamkasse.js",
  "./md-kabine.js",
  "./md-aufstellung.js",
  "./md-print.js",
  "./md-taktikboard.js",
  "./md-taktik-draw.js",
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
  "./md-live-vollbild.js",
  "./md-fundbuero.js",
  "./md-taktik-bib.js",
  "./md-ausruestung.js",
  "./md-galerie.js",
  "./md-kasse.js",
  "./md-ki-coach.js",
  "./md-skizze.js",
  "./boot.js",
  "./logo.png",
  "./icon-trainer.png",
  "./icon-trainer-maskable.png",
  "./icon-eltern.png",
  "./icon-eltern-maskable.png",
  "./manifest-trainer.json",
  "./manifest-eltern.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
];

// Font-Dateien aus den precachten CSS-Dateien extrahieren und mitcachen,
// damit Schrift + Icons auch beim allerersten Offline-Start funktionieren.
async function precacheFonts(cache){
  const cssUrls=PRECACHE.filter(u=>u.endsWith(".css")||u.includes("fonts.googleapis"));
  for(const cssUrl of cssUrls){
    try{
      const res=await fetch(cssUrl);
      if(!res.ok)continue;
      const css=await res.text();
      const urls=[...css.matchAll(/url\((['"]?)(https?:\/\/[^)'"]+)\1\)/g)].map(m=>m[2]);
      await Promise.all([...new Set(urls)].map(async u=>{
        try{
          const fr=await fetch(u,{mode:"cors"});
          if(fr.ok)await cache.put(u,fr);
        }catch(e){/* einzelne Fontdatei optional */}
      }));
    }catch(e){/* CSS optional */}
  }
}

self.addEventListener("install",e=>{
  // cache:"reload" umgeht den HTTP-Cache des Browsers. Ohne das kann der Precache eine
  // Datei aus dem Browser-Cache uebernehmen (GitHub Pages liefert HTML mit max-age=600)
  // und der neue Service Worker startet mit einer veralteten index.html.
  const frisch=PRECACHE.map(u=>new Request(u,{cache:"reload"}));
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(frisch).then(()=>precacheFonts(c)))
      .then(()=>self.skipWaiting())
  );
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
  if(pfad.includes("/trainer/"))return "./trainer/";
  return "./index.html"; // die Weiche in der Wurzel
}

self.addEventListener("fetch",e=>{
  const url=e.request.url;
  if(url.includes("supabase.co"))return;
  if(url.includes("open-meteo.com"))return; // Wetter: nie cachen (ignoreSearch würde die Datums-Query zerstören)
  if(url.includes("openstreetmap.org"))return; // Geocoding/Adress-Suche: nie cachen (Query-Sicherheit)
  if(url.includes("openholidaysapi.org"))return; // Ferien-Radar: nie cachen (ignoreSearch würde die Datums-Query zerstören)
  if(url.includes("api.qrserver.com"))return; // QR-Aushang: nie cachen (ignoreSearch würde die Daten-Query zerstören)
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
    body:d.body||"", icon:"./logo.png", badge:"./logo.png",
    data:{url:d.url||"./"}, tag:d.tag||"adler", renotify:true,
    vibrate:[40,60,40]
  };
  e.waitUntil(self.registration.showNotification(title,opts));
});
// Klick auf die Benachrichtigung: vorhandenes Fenster fokussieren/navigieren oder neu öffnen.
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    for(const c of cs){ if("focus" in c){ try{c.navigate(url);}catch(_){} return c.focus(); } }
    return clients.openWindow(url);
  }));
});
