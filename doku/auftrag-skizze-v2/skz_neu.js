/* Referenzimplementierung für Auftragspaket Skizze v2 – _skz aus data.js, ergänzt um
   Jugendtor (5. Feld 'j' in tor) und die Linienliste li (typ 'm' Mittellinie, 'sz' Schusszone).
   Nicht direkt einbinden – Abschnitt 1 des Auftragspakets beschreibt die Änderung. */
const SKZ_PFEIL={p:'#ffffff',l:'#fde047',s:'#fca5a5',d:'#7dd3fc'};
const SKZ_PFEIL_NAME={p:'Pass',l:'Laufweg',s:'Schuss',d:'Dribbling'};
function _skz(o){
  const F={g:'#4ade80',r:'#f87171',b:'#60a5fa',y:'#fbbf24',w:'#fff'};
  const E=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const S=['<rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>',
    '<rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>',
    '<defs>'+Object.keys(SKZ_PFEIL).map(t=>'<marker id="arr-'+t+'" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="'+SKZ_PFEIL[t]+'"/></marker>').join('')+'</defs>'];
  (o.z||[]).forEach(z=>S.push('<rect x="'+z[0]+'" y="'+z[1]+'" width="'+z[2]+'" height="'+z[3]+'" rx="3" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="6,3"/>'));
  /* NEU: Linien nach den Zonen, vor den Toren */
  (o.li||[]).forEach(l=>{const sz=l[4]==='sz';
    S.push('<line x1="'+l[0]+'" y1="'+l[1]+'" x2="'+l[2]+'" y2="'+l[3]+'" stroke="'+(sz?'#fbbf24':'rgba(255,255,255,.7)')+'" stroke-width="2"'+(sz?' stroke-dasharray="5,4"':'')+'/>');});
  /* NEU: Jugendtor über fünftes Feld 'j' – ohne fünftes Feld unverändert Minitor */
  (o.tor||[]).forEach(t=>{const w=t[3]||24, j=t[4]==='j', d=j?10:7, sw=j?3:2.5;
    const v=t[2]==='v';
    S.push('<rect x="'+t[0]+'" y="'+t[1]+'" width="'+(v?d:w)+'" height="'+(v?w:d)+'" rx="2" fill="'+(j?'rgba(255,255,255,.25)':'none')+'" stroke="#fff" stroke-width="'+sw+'"/>');
    if(j){ // Netzschraffur, damit Jugendtor und Minitor auch ohne Größenvergleich unterscheidbar sind
      const n=4, st=w/n;
      for(let i=1;i<n;i++)S.push(v?'<line x1="'+t[0]+'" y1="'+(t[1]+i*st)+'" x2="'+(t[0]+d)+'" y2="'+(t[1]+i*st)+'" stroke="#fff" stroke-width="1"/>'
                                 :'<line x1="'+(t[0]+i*st)+'" y1="'+t[1]+'" x2="'+(t[0]+i*st)+'" y2="'+(t[1]+d)+'" stroke="#fff" stroke-width="1"/>');
    }});
  (o.leiter||[]).forEach(l=>{const n=6,st=l[2]/n;
    S.push('<rect x="'+l[0]+'" y="'+l[1]+'" width="'+(l[3]==='v'?16:l[2])+'" height="'+(l[3]==='v'?l[2]:16)+'" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>');
    for(let i=1;i<n;i++)S.push(l[3]==='v'
      ?'<line x1="'+l[0]+'" y1="'+(l[1]+i*st)+'" x2="'+(l[0]+16)+'" y2="'+(l[1]+i*st)+'" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>'
      :'<line x1="'+(l[0]+i*st)+'" y1="'+l[1]+'" x2="'+(l[0]+i*st)+'" y2="'+(l[1]+16)+'" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>');});
  (o.wand||[]).forEach(w=>S.push('<line x1="'+w[0]+'" y1="'+w[1]+'" x2="'+w[2]+'" y2="'+w[3]+'" stroke="#d1d5db" stroke-width="5" stroke-linecap="round"/>'));
  (o.p||[]).forEach(p=>{const typ=SKZ_PFEIL[p[4]]?p[4]:'p';
    S.push('<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+p[2]+'" y2="'+p[3]+'" stroke="'+SKZ_PFEIL[typ]+'" stroke-width="'+(typ==='s'?3:1.5)+'"'+(typ==='l'?' stroke-dasharray="5,3"':typ==='d'?' stroke-dasharray="2,3"':'')+' marker-end="url(#arr-'+typ+')"/>');});
  (o.h||[]).forEach(h=>S.push('<path d="M'+h[0]+' '+(h[1]-6)+' L'+(h[0]+5)+' '+(h[1]+4)+' L'+(h[0]-5)+' '+(h[1]+4)+' Z" fill="'+(F[h[2]]||'#fbbf24')+'" stroke="rgba(0,0,0,.25)" stroke-width="1"/>'));
  (o.s||[]).forEach(sp=>{S.push('<circle cx="'+sp[0]+'" cy="'+sp[1]+'" r="8" fill="'+(F[sp[2]]||'#4ade80')+'" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>');
    if(sp[3])S.push('<text x="'+sp[0]+'" y="'+(sp[1]+3)+'" text-anchor="middle" fill="rgba(0,0,0,.65)" font-size="8" font-family="sans-serif" font-weight="700">'+E(sp[3])+'</text>');});
  (o.b||[]).forEach(b=>S.push('<circle cx="'+b[0]+'" cy="'+b[1]+'" r="4" fill="#fff" stroke="#333" stroke-width="1"/>'));
  (o.tx||[]).forEach(t=>S.push('<text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" fill="rgba(255,255,255,.85)" font-size="9" font-family="sans-serif" font-weight="600">'+E(t[2])+'</text>'));
  return '<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">'+S.join('')+'</svg>';
}
