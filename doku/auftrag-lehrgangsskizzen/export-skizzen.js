/* Export für die Lehrgangs-Abgabe: PNG und SVG, beide mit Legende.

   Die Skizze selbst kommt unveraendert aus _skz – dieselbe Zeichnung wie im
   Uebungsdetail. Darunter wird ein Legendenstreifen gesetzt, dessen Farben und
   Namen aus SKZ_PFEIL und SKZ_PFEIL_NAME der App gelesen werden, nicht abgetippt.
   Das PNG entsteht aus GENAU diesem SVG ueber denselben Canvas-Weg wie
   „Skizze teilen" – PNG und SVG koennen deshalb nicht auseinanderlaufen. */
const fs=require("fs"), path=require("path");
const h=require(path.join(process.cwd(),"tests/harness.js"));
const AUS=__dirname;

(async()=>{
  const s=await h.starten({hoehe:1200,supabase:h.supabaseAttrappe({kader:h.kaderZeilen()})});
  const bib=JSON.parse(fs.readFileSync(path.join(process.cwd(),"uebungen/bibliothek.json"),"utf8"));
  const ziel=bib.uebungen.filter(u=>/Dreieck \(Grundform\)|Raute \(Steigerung\)/.test(u.name));
  if(ziel.length!==2)throw new Error("Erwartet 2 neue Uebungen, gefunden "+ziel.length);

  for(const u of ziel){
    const r=await s.page.evaluate(async({spec,B})=>{
      /* 1) Die Skizze wie im Detail */
      const roh=_skz(spec);
      const halter=document.createElement("div"); halter.innerHTML=roh;
      const skz=halter.querySelector("svg");
      const inhalt=skz.innerHTML;

      /* 2) Legende als SVG, Farben und Namen aus den Konstanten der App */
      const H_SKZ=180, H_LEG=36, GESAMT=H_SKZ+H_LEG;
      const eintraege=[
        {art:"linie",c:SKZ_PFEIL.p,w:1.5,dash:"",  kopf:true, txt:SKZ_PFEIL_NAME.p},
        {art:"linie",c:SKZ_PFEIL.l,w:1.5,dash:"5,3",kopf:true, txt:SKZ_PFEIL_NAME.l},
        {art:"linie",c:SKZ_PFEIL.s,w:3,  dash:"",  kopf:true, txt:SKZ_PFEIL_NAME.s},
        {art:"linie",c:SKZ_PFEIL.d,w:1.5,dash:"2,3",kopf:true, txt:SKZ_PFEIL_NAME.d},
        {art:"linie",c:"#fbbf24",   w:2,  dash:"5,4",kopf:false,txt:"Schusszone"},
        {art:"linie",c:"rgba(255,255,255,.7)",w:2,dash:"",kopf:false,txt:"Mittellinie"}
      ];
      const teile=[];
      teile.push('<rect x="0" y="'+H_SKZ+'" width="280" height="'+H_LEG+'" fill="#1f4d1f"/>');
      const spalten=3, zellB=280/spalten;
      eintraege.forEach((e,i)=>{
        const sp=i%spalten, ze=Math.floor(i/spalten);
        const x0=sp*zellB+6, y=H_SKZ+12+ze*16;
        /* Pfeilspitze als eigener Pfad statt als Marker – ein Marker waechst mit der
           Strichstaerke, und der dicke Schuss-Strich haette darunter verschwunden.
           Genauso macht es die Legende der App in skzLegende(). */
        const ende=e.kopf?x0+15:x0+22;
        teile.push('<line x1="'+x0+'" y1="'+y+'" x2="'+ende+'" y2="'+y+'" stroke="'+e.c+'" stroke-width="'+e.w+'"'
          +(e.dash?' stroke-dasharray="'+e.dash+'"':'')+'/>');
        if(e.kopf)teile.push('<path d="M'+ende+','+(y-3.2)+' L'+(x0+22)+','+y+' L'+ende+','+(y+3.2)+' Z" fill="'+e.c+'"/>');
        teile.push('<text x="'+(x0+28)+'" y="'+(y+3)+'" fill="rgba(255,255,255,.85)" font-size="8" font-family="sans-serif" font-weight="600">'+e.txt+'</text>');
      });
      const marker=teile.filter(t=>t.startsWith("<marker")).join("");
      const rest=teile.filter(t=>!t.startsWith("<marker")).join("");
      const voll='<svg viewBox="0 0 280 '+GESAMT+'" width="280" height="'+GESAMT+'" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'+marker+'</defs>'+inhalt+rest+'</svg>';

      /* 3) PNG aus genau diesem SVG – derselbe Weg wie skzTeilen */
      const Hpx=Math.round(B*GESAMT/280);
      const kopie=new DOMParser().parseFromString(voll,"image/svg+xml").documentElement;
      kopie.setAttribute("width",B); kopie.setAttribute("height",Hpx);
      const text=new XMLSerializer().serializeToString(kopie);
      const url=URL.createObjectURL(new Blob([text],{type:"image/svg+xml;charset=utf-8"}));
      const bild=new Image();
      await new Promise((ok,no)=>{bild.onload=ok;bild.onerror=()=>no(new Error("Bild"));bild.src=url;});
      const c=document.createElement("canvas"); c.width=B; c.height=Hpx;
      c.getContext("2d").drawImage(bild,0,0,B,Hpx);
      const png=c.toDataURL("image/png");
      URL.revokeObjectURL(url);
      return {svg:voll,png,breite:B,hoehe:Hpx};
    },{spec:u.skizze,B:1120});

    const slug=u.name.includes("Dreieck")?"3-gegen-3-dreieck-grundform":"4plus1-gegen-4plus1-raute-steigerung";
    fs.writeFileSync(path.join(AUS,slug+".png"),Buffer.from(r.png.split(",")[1],"base64"));
    fs.writeFileSync(path.join(AUS,slug+".svg"),r.svg);
    console.log(`${u.name}: ${slug}.png (${r.breite}x${r.hoehe}) + ${slug}.svg`);
  }
  console.log("Konsolenfehler:",s.fehler().length?s.fehler()[0]:"keine");
  await s.schliessen();
})();
