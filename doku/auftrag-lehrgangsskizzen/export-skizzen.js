/* Export für die Lehrgangs-Abgabe: PNG und SVG, beide mit Legende.

   Die Skizze selbst kommt unveraendert aus _skz – dieselbe Zeichnung wie im
   Uebungsdetail. Darunter wird ein Legendenstreifen gesetzt, dessen Farben und
   Namen aus SKZ_PFEIL und SKZ_PFEIL_NAME der App gelesen werden, nicht abgetippt.
   Das PNG entsteht aus GENAU diesem SVG ueber denselben Canvas-Weg wie
   „Skizze teilen" – PNG und SVG koennen deshalb nicht auseinanderlaufen. */
const fs=require("fs"), path=require("path");
const h=require(path.join(process.cwd(),"tests/harness.js"));

/* v554: Der Lauf ist ein Baustein geworden. Das Paket Einheit LF4 braucht denselben
   Export fuer zwei andere Uebungen in einen anderen Ordner – eine Kopie des Skripts
   waere die zweite Wahrheit, die beim naechsten Legendeneintrag auseinanderlaeuft.
   Aufruf ohne Argumente: die beiden Lehrgangsskizzen wie bisher. Mit
   {aus, auswahl: [{muster, slug}]} exportiert der Aufrufer, was er braucht.

   v583 – DREI DINGE, DIE DAS SKRIPT NOCH NICHT KONNTE:

   1) HOCHFORMAT. Breite und Hoehe standen fest auf 280 x 180. Eine hochkante Skizze
      (seit v578: 180 x 280) waere beschnitten worden, und die Legende haette mitten im
      Bild gelegen. Beides kommt jetzt aus der viewBox der gerenderten Skizze.
   2) DAS DRIBBLING. Die Legende zeichnete es als gepunktete Gerade – seit v578 ist es
      eine durchgezogene Schlangenlinie. Der Streifen haette etwas anderes erklaert, als
      im Bild darueber steht. Gezeichnet wird es jetzt mit `_skzWelle` aus der App.
   3) BILD 1 OHNE ZUSATZ. Das war fuer Abgaben richtig, die auf den Namen verweisen.
      Wer zwei gleichwertige Bilder braucht, setzt `bildEins:true` und bekommt
      `-bild-1` und `-bild-2`. Ohne die Angabe bleibt alles wie bisher. */
const STANDARD={
  aus:__dirname,
  auswahl:[
    {muster:/Dreieck \(Grundform\)/,slug:"3-gegen-3-dreieck-grundform"},
    {muster:/Raute \(Steigerung\)/,slug:"4plus1-gegen-4plus1-raute-steigerung"}
  ]
};

/* v590 – Der Legendenstreifen ist ein Helfer im Browser, den Bild-Export UND Animation
   rufen. Vorher stand er im Bild-Export inline; die Animation hätte ihn kopieren müssen,
   und zwei Legenden laufen früher oder später auseinander. Farben und Namen kommen aus
   den Konstanten der App, die Auswahl der Einträge aus skzLegendeArten (v587). */
function imBrowserHelfer(){
  window._expLegende=function(spec,BREITE,H_SKZ){
    const A=(typeof skzLegendeArten==="function")?skzLegendeArten(spec):null;
    const eintraege=[
      {key:"p", art:"linie",c:SKZ_PFEIL.p,w:1.5,dash:"",  kopf:true, txt:SKZ_PFEIL_NAME.p},
      {key:"l", art:"linie",c:SKZ_PFEIL.l,w:1.5,dash:"5,3",kopf:true, txt:SKZ_PFEIL_NAME.l},
      {key:"s", art:"linie",c:SKZ_PFEIL.s,w:3,  dash:"",  kopf:true, txt:SKZ_PFEIL_NAME.s},
      /* v583: durchgezogen und geschwungen wie im Bild darueber (v578). */
      {key:"d", art:"welle",c:SKZ_PFEIL.d,w:1.5,dash:"",  kopf:true, txt:SKZ_PFEIL_NAME.d},
      {key:"sz",art:"linie",c:"#fbbf24",   w:2,  dash:"5,4",kopf:false,txt:"Schusszone"},
      {key:"m", art:"linie",c:"rgba(255,255,255,.7)",w:2,dash:"",kopf:false,txt:"Mittellinie"}
    ].filter(e=>!A||A.has(e.key));
    const spalten=BREITE<220?2:3, zeilen=Math.max(1,Math.ceil(eintraege.length/spalten));
    const H_LEG=12+zeilen*16;
    const teile=[];
    teile.push('<rect x="0" y="'+H_SKZ+'" width="'+BREITE+'" height="'+H_LEG+'" fill="#1f4d1f"/>');
    const zellB=BREITE/spalten;
    eintraege.forEach((e,i)=>{
      const sp=i%spalten, ze=Math.floor(i/spalten);
      const x0=sp*zellB+6, y=H_SKZ+12+ze*16;
      /* Pfeilspitze als eigener Pfad statt als Marker – ein Marker waechst mit der
         Strichstaerke, und der dicke Schuss-Strich haette darunter verschwunden.
         Genauso macht es die Legende der App in skzLegende(). */
      const ende=e.kopf?x0+15:x0+22;
      if(e.art==="welle"&&typeof _skzWelle==="function"){
        teile.push('<path d="'+_skzWelle(x0,y,ende,y)+'" fill="none" stroke="'+e.c+'" stroke-width="'+e.w+'" stroke-linecap="round"/>');
      }else{
        teile.push('<line x1="'+x0+'" y1="'+y+'" x2="'+ende+'" y2="'+y+'" stroke="'+e.c+'" stroke-width="'+e.w+'"'
          +(e.dash?' stroke-dasharray="'+e.dash+'"':'')+'/>');
      }
      if(e.kopf)teile.push('<path d="M'+ende+','+(y-3.2)+' L'+(x0+22)+','+y+' L'+ende+','+(y+3.2)+' Z" fill="'+e.c+'"/>');
      teile.push('<text x="'+(x0+28)+'" y="'+(y+3)+'" fill="rgba(255,255,255,.85)" font-size="8" font-family="sans-serif" font-weight="600">'+e.txt+'</text>');
    });
    return {teile,H_LEG};
  };
  /* Ein Bild (Skizze plus Legende) als eigenstaendiges SVG. */
  /* legendeSpec: woraus die Legende ihre Einträge nimmt – bei der Animation die GANZE
     Beschreibung, nicht das einzelne Zwischenbild, sonst spränge der Streifen je Bild. */
  window._expBild=function(spec,nr,B,legendeSpec){
    const roh=_skz(spec,nr?{bild:nr}:undefined);
    const halter=document.createElement("div"); halter.innerHTML=roh;
    const skz=halter.querySelector("svg");
    const vb=String(skz.getAttribute("viewBox")||"0 0 280 180").split(/\s+/).map(Number);
    const BREITE=vb[2]||280, H_SKZ=vb[3]||180;
    const L=_expLegende(legendeSpec||spec,BREITE,H_SKZ), GESAMT=H_SKZ+L.H_LEG;
    const marker=L.teile.filter(t=>t.startsWith("<marker")).join("");
    const rest=L.teile.filter(t=>!t.startsWith("<marker")).join("");
    const voll='<svg viewBox="0 0 '+BREITE+' '+GESAMT+'" width="'+BREITE+'" height="'+GESAMT+'" xmlns="http://www.w3.org/2000/svg">'
      +'<defs>'+marker+'</defs>'+skz.innerHTML+rest+'</svg>';
    return {svg:voll,BREITE,GESAMT,Hpx:Math.round(B*GESAMT/BREITE)};
  };
  /* SVG-Text auf eine Leinwand zeichnen – derselbe Weg wie skzTeilen. */
  window._expLeinwand=async function(svgText,B,Hpx){
    const kopie=new DOMParser().parseFromString(svgText,"image/svg+xml").documentElement;
    kopie.setAttribute("width",B); kopie.setAttribute("height",Hpx);
    const text=new XMLSerializer().serializeToString(kopie);
    const url=URL.createObjectURL(new Blob([text],{type:"image/svg+xml;charset=utf-8"}));
    const bild=new Image();
    await new Promise((ok,no)=>{bild.onload=ok;bild.onerror=()=>no(new Error("Bild"));bild.src=url;});
    const c=document.createElement("canvas"); c.width=B; c.height=Hpx;
    c.getContext("2d").drawImage(bild,0,0,B,Hpx);
    URL.revokeObjectURL(url);
    return c;
  };
}

async function exportSkizzen(opt){
  const {aus,auswahl,bildEins}=Object.assign({},STANDARD,opt||{});
  const AUS=aus;
  const s=await h.starten({hoehe:1200,supabase:h.supabaseAttrappe({kader:h.kaderZeilen()})});
  await s.page.evaluate(imBrowserHelfer);
  const bib=JSON.parse(fs.readFileSync(path.join(process.cwd(),"uebungen/bibliothek.json"),"utf8"));
  const ziel=auswahl.map(a=>{
    const t=bib.uebungen.filter(u=>a.muster.test(u.name));
    if(t.length!==1)throw new Error("Muster "+a.muster+" trifft "+t.length+" Uebungen, erwartet genau 1");
    return Object.assign({},t[0],{slug:a.slug});
  });

  for(const u of ziel){
   /* v557: Hat eine Skizze Schritte, bekommt jedes Bild eine eigene Datei. Bild 1
      behaelt den Namen ohne Zusatz – die Abgaben verweisen darauf. */
   const bilder=await s.page.evaluate(sp=>(typeof skzBildZahl==="function")?skzBildZahl(sp):1,u.skizze);
   for(let nr=0;nr<bilder;nr++){
    const r=await s.page.evaluate(async({spec,B,nr})=>{
      /* 1) Skizze wie im Detail plus Legende (Helfer oben), 2) PNG aus genau diesem SVG */
      const bild=_expBild(spec,nr,B);
      const c=await _expLeinwand(bild.svg,B,bild.Hpx);
      return {svg:bild.svg,png:c.toDataURL("image/png"),breite:B,hoehe:bild.Hpx};
    },{spec:u.skizze,B:1120,nr});

    const slug=u.slug+((nr||bildEins)?("-bild-"+(nr+1)):"");
    fs.writeFileSync(path.join(AUS,slug+".png"),Buffer.from(r.png.split(",")[1],"base64"));
    fs.writeFileSync(path.join(AUS,slug+".svg"),r.svg);
    console.log(`${u.name}: ${slug}.png (${r.breite}x${r.hoehe}) + ${slug}.svg`);
   }
  }
  console.log("Konsolenfehler:",s.fehler().length?s.fehler()[0]:"keine");
  await s.schliessen();
}

/* ═══ v590 – DIE GANZE ÜBUNG ALS EINE ANIMATION ═══
   Charles am 20.09.: „Kannst du zusätzlich eine Animation machen, die alle Bilder vereint?"
   Die App tut das im großen Fenster („Abspielen"); außerhalb der App gab es davon nichts.
   Hier entsteht ein animiertes GIF aus GENAU den Zwischenbildern und Zeiten des Abspielens:
   _skzZwischen für die Stellungen dazwischen, SKZ_STAND als Standzeit, _skzGleitDauer für
   die Gleitzeit nach Strecke (v588), dieselbe weiche Kurve. Das GIF ist keine zweite
   Animation, sondern die der App, festgehalten. Kodiert wird im Browser (LZW nach dem
   GIF89a-Standard, Palette per Median-Cut) – ohne fremde Werkzeuge, denn ffmpeg gibt es
   in der Prüfumgebung nicht. GIF, weil es überall läuft: WhatsApp, Drive, PowerPoint. */
async function exportAnimation(opt){
  const {aus,muster,slug,breite,fps,schlussMs}=Object.assign({aus:__dirname,breite:360,fps:10,schlussMs:2000},opt||{});
  if(!muster||!slug)throw new Error("exportAnimation braucht {muster, slug}");
  const s=await h.starten({hoehe:1200,supabase:h.supabaseAttrappe({kader:h.kaderZeilen()})});
  await s.page.evaluate(imBrowserHelfer);
  const bib=JSON.parse(fs.readFileSync(path.join(process.cwd(),"uebungen/bibliothek.json"),"utf8"));
  const t=bib.uebungen.filter(u=>muster.test(u.name));
  if(t.length!==1)throw new Error("Muster "+muster+" trifft "+t.length+" Uebungen, erwartet genau 1");
  const u=t[0];
  const r=await s.page.evaluate(async({spec,B,fps,schlussMs})=>{
    const fehlt=["skzBildZahl","_skzBild","_skzZwischen","_skzGleitDauer","_skzBewegt"].filter(n=>typeof window[n]!=="function");
    if(fehlt.length)return {fehlt};
    const n=skzBildZahl(spec), schritt=1000/fps;
    /* 1) Die Zeitleiste – dieselbe wie in _skzGrTakt (md-skizze.js) */
    const zeiten=[];   // {t: 0..1 zwischen Bild i und i+1 | null = Stand}
    for(let i=0;i<n;i++){
      const stand=(i===n-1)?schlussMs:SKZ_STAND;
      for(let k=0;k<Math.round(stand/schritt);k++)zeiten.push({i,t:null});
      if(i===n-1)break;
      const a=_skzBild(spec,i), b=_skzBild(spec,i+1);
      if(!_skzBewegt(a,b)){ zeiten.push({i:i+1,t:null}); continue; }   // stiller Übergang: kurz durchschalten
      const dauer=_skzGleitDauer(a,b), k=Math.max(1,Math.round(dauer/schritt));
      for(let j=1;j<=k;j++){ const x=j/k; zeiten.push({i,t:x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}); }
    }
    /* 2) Jedes Zwischenbild zeichnen */
    const bilder=[]; let W=0,H=0;
    for(const z of zeiten){
      const a=_skzBild(spec,z.i);
      const frame=(z.t==null)?a:_skzZwischen(a,_skzBild(spec,z.i+1),z.t);
      const bild=_expBild(frame,0,B,spec);
      const c=await _expLeinwand(bild.svg,B,bild.Hpx);
      W=c.width; H=c.height;
      bilder.push(c.getContext("2d").getImageData(0,0,W,H).data);
    }
    /* 3) Palette per Median-Cut aus einer Stichprobe */
    const probe=[];
    [0,Math.floor(bilder.length/3),Math.floor(bilder.length*2/3),bilder.length-1].forEach(fi=>{
      const d=bilder[fi]; for(let p=0;p<d.length;p+=4*5)probe.push([d[p],d[p+1],d[p+2]]);
    });
    let boxen=[probe];
    while(boxen.length<255){
      boxen.sort((x,y)=>spanne(y)-spanne(x));
      const box=boxen[0]; if(box.length<2||spanne(box)===0)break;
      const ch=kanal(box); box.sort((p,q)=>p[ch]-q[ch]);
      const mitte=box.length>>1; boxen.splice(0,1,box.slice(0,mitte),box.slice(mitte));
    }
    function spanne(box){ let m=0; for(let ch=0;ch<3;ch++){ let lo=255,hi=0; for(const p of box){ if(p[ch]<lo)lo=p[ch]; if(p[ch]>hi)hi=p[ch]; } m=Math.max(m,hi-lo);} return m; }
    function kanal(box){ let best=0,bs=-1; for(let ch=0;ch<3;ch++){ let lo=255,hi=0; for(const p of box){ if(p[ch]<lo)lo=p[ch]; if(p[ch]>hi)hi=p[ch]; } if(hi-lo>bs){bs=hi-lo;best=ch;} } return best; }
    const palette=boxen.map(box=>{ const s=[0,0,0]; box.forEach(p=>{s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];}); return s.map(v=>Math.round(v/box.length)); });
    while(palette.length<256)palette.push([0,0,0]);
    const cache=new Map();
    const index=(r,g,b)=>{ const key=(r<<16)|(g<<8)|b; let v=cache.get(key); if(v!=null)return v;
      let best=0,bd=1e9; for(let i=0;i<boxen.length;i++){ const p=palette[i]; const d=(p[0]-r)*(p[0]-r)+(p[1]-g)*(p[1]-g)+(p[2]-b)*(p[2]-b); if(d<bd){bd=d;best=i;} }
      cache.set(key,best); return best; };
    /* 4) GIF89a – LZW wie in jedem Kodierer seit 1989 */
    const out=[];
    const w16=v=>{ out.push(v&255,(v>>8)&255); };
    const str=t=>{ for(let i=0;i<t.length;i++)out.push(t.charCodeAt(i)); };
    str("GIF89a"); w16(W); w16(H); out.push(0xF7,0,0);
    palette.forEach(p=>out.push(p[0],p[1],p[2]));
    out.push(0x21,0xFF,0x0B); str("NETSCAPE2.0"); out.push(3,1,0,0,0);     // Schleife ohne Ende
    const verzoegerung=Math.max(2,Math.round(schritt/10));                  // Hundertstelsekunden
    for(const d of bilder){
      const idx=new Uint8Array(W*H);
      for(let p=0,q=0;p<d.length;p+=4,q++)idx[q]=index(d[p],d[p+1],d[p+2]);
      out.push(0x21,0xF9,4,0x04); w16(verzoegerung); out.push(0,0);
      out.push(0x2C); w16(0); w16(0); w16(W); w16(H); out.push(0);
      out.push(8);
      const daten=lzw(idx,8);
      for(let p=0;p<daten.length;p+=255){ const st=daten.slice(p,p+255); out.push(st.length,...st); }
      out.push(0);
    }
    out.push(0x3B);
    function lzw(px,minCode){
      const clear=1<<minCode, eoi=clear+1, aus=[]; let cur=0,bits=0,codeSize=minCode+1,next=eoi+1,tab=new Map();
      const emit=code=>{ cur|=code<<bits; bits+=codeSize; while(bits>=8){ aus.push(cur&255); cur>>>=8; bits-=8; } };
      emit(clear);
      let w=px[0];
      for(let i=1;i<px.length;i++){
        const c=px[i], key=(w<<8)|c, hit=tab.get(key);
        if(hit!=null){ w=hit; continue; }
        emit(w);
        if(next===4096){ emit(clear); next=eoi+1; codeSize=minCode+1; tab=new Map(); }
        else{ if(next>=(1<<codeSize))codeSize++; tab.set(key,next++); }
        w=c;
      }
      emit(w); emit(eoi); if(bits>0)aus.push(cur&255);
      return aus;
    }
    let bin=""; for(let p=0;p<out.length;p+=8192)bin+=String.fromCharCode.apply(null,out.slice(p,p+8192));
    return {gif:btoa(bin),bilder:bilder.length,W,H,farben:boxen.length,sekunden:Math.round(zeiten.length*schritt/100)/10};
  },{spec:u.skizze,B:breite,fps,schlussMs});
  console.log("Konsolenfehler:",s.fehler().length?s.fehler()[0]:"keine");
  await s.schliessen();
  if(r.fehlt)throw new Error("Im Browser fehlt: "+r.fehlt.join(", "));
  const datei=path.join(aus,slug+"-animation.gif");
  fs.writeFileSync(datei,Buffer.from(r.gif,"base64"));
  console.log(`${u.name}: ${path.basename(datei)} – ${r.bilder} Bilder, ${r.W}x${r.H}, ${r.farben} Farben, ${r.sekunden} s, ${Math.round(fs.statSync(datei).size/1024)} KB`);
  return datei;
}

module.exports=exportSkizzen;
module.exports.exportAnimation=exportAnimation;
if(require.main===module)exportSkizzen();
