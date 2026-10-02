/* ═══════════════════════════════════════════════════════════
   ADLER MATCHDAY & ELTERN LAYER (Modularisierung 7/8)
   1) Eltern-Portal: OTP-Login, Dashboard, RSVP, Carpool, Fanfacts,
      Teamkasse, Kabine (Kids-Mode) + KADER/TRAINER-Stammdaten.
   2) Spieltag/Taktik: Bearbeitbare Aufstellung, Print/PDF,
      Taktik-Board, Canvas-Draw, Video-Taktikboard.
   3) Termine/Match-Zentrale: Kalender, Nominierung+RSVP, Match-Uhr,
      Ticker, Spielbericht, Analyse, Blitz, Voice, Live-Aktion.
   Laedt nach quiz.js, vor dem Haupt-Skript.
   Top-Level: nur renderTrainerUI() (blockintern definiert).
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════
   ELTERN-PORTAL / OTP-AUTH (Phase 10-L) – Login per 6-stelligem Code. Seit v604 zweiter
   Weg neben E-Mail und Passwort (authPasswortLogin) und der Einladungskarte.
   Bewusst OTP-Code statt Magic-Link: der Code wird IN der PWA eingegeben → Session
   bleibt im selben Kontext (kein Browser-Wechsel). Session-Format = SB_TOKEN_KEY,
   damit Refresh/Header/401-Handling wiederverwendet werden.
   Merksatz: Rollen-Routing = UX, die Sicherheit macht ausschließlich die RLS.
═══════════════════════════════════ */
/* v636: Supabase antwortet englisch („For security purposes, you can only request this after
   60 seconds.“). Eltern sehen nur deutsche Sätze; unbekannte Meldungen bekommen einen Ersatztext. */
function authFehlerDeutsch(m,ersatz){
  m=String(m||"");
  if(/seconds|rate limit|too many/i.test(m))return "Bitte eine Minute warten und dann nochmal – aus Sicherheitsgründen geht das nicht öfter.";
  if(/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m))return "Der Code ist abgelaufen oder falsch. Bitte einen neuen anfordern.";
  if(/invalid login|invalid.*credentials/i.test(m))return "E-Mail oder Passwort stimmt nicht. Noch kein Passwort? Dann unten „Code per E-Mail“.";
  if(/email.*(invalid|valid)|unable to validate email/i.test(m))return "Diese E-Mail-Adresse sieht nicht richtig aus.";
  if(/weak|at least|characters/i.test(m))return "Das Passwort ist zu schwach – bitte "+pwRegelText()+".";
  if(/network|failed to fetch/i.test(m))return "Gerade kein Internet – bitte gleich nochmal.";
  return ersatz;
}
async function authOtpRequest(email){
  const r=await fetch(`${SB_URL}/auth/v1/otp`,{method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(authFehlerDeutsch(data.error_description||data.msg||data.error,"Code konnte nicht gesendet werden."));
  return true;
}
async function authOtpVerify(email,token){
  const r=await fetch(`${SB_URL}/auth/v1/verify`,{method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,token,type:"email"})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.access_token)throw new Error(authFehlerDeutsch(data.error_description||data.msg||data.error,"Code ungültig oder abgelaufen."));
  elternSitzungSpeichern(data);
  return true;
}
function elternSitzungSpeichern(data){
  const expiresAt=data.expires_at||(Math.floor(Date.now()/1000)+(data.expires_in||3600));
  localStorage.setItem(SB_TOKEN_KEY_ELTERN,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||null,expires_at:expiresAt})); // eigenes Fach – ueberschreibt den Trainer nicht mehr
}
/* v604: Anmelden mit E-Mail und Passwort. Konten aus der Einladungskarte haben eines;
   aeltere Konten (nur Einmal-Code) nicht – die nehmen den Code und legen im Eltern-Bereich
   eines fest. Kein Mailversand noetig, deshalb der Hauptweg. */
async function authPasswortLogin(email,passwort){
  const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:passwort})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.access_token){
    const m=String(data.error_description||data.msg||data.error||"");
    throw new Error(/invalid/i.test(m)?"E-Mail oder Passwort stimmt nicht. Noch kein Passwort? Dann unten „Code per E-Mail“.":authFehlerDeutsch(m,"Anmeldung hat nicht geklappt – bitte nochmal."));
  }
  elternSitzungSpeichern(data);
  return true;
}
/* v636: authRole unterscheidet „kein Profil“ von „kein Netz“. Vorher warf ein Öffnen ohne
   Empfang am Platz die Anmeldung weg (Token samt refresh_token gelöscht). Jetzt gilt bei Netz-
   oder Serverfehler die zuletzt bestätigte Rolle weiter; abgemeldet wird nur bei echter Antwort. */
let _authOffline=false;
async function authRole(){
  _authOffline=false;
  if(!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/profiles?select=role&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok){ if(r.status>=500){_authOffline=true; try{return localStorage.getItem("adler_rolle")||null;}catch(e){return null;}} return null; }
    const rows=await r.json();
    const rolle=(rows[0]&&rows[0].role)||null;
    try{ if(rolle)localStorage.setItem("adler_rolle",rolle); else localStorage.removeItem("adler_rolle"); }catch(e){}
    return rolle;
  }catch(e){ _authOffline=true; try{return localStorage.getItem("adler_rolle")||null;}catch(e2){return null;} }
}
let epEmail="";
async function renderElternPortal(){
  /* v604: Einladungskarte (?portal&einladung=CODE). Den Code sofort aus der Adresse nehmen
     und nur fuer diesen Tab puffern – ein Lesezeichen oder ein geteilter Bildschirm traegt
     ihn dann nicht weiter. Die Einladungsseite liest ihn aus dem Puffer. */
  try{
    const einlUrl=new URLSearchParams(location.search).get("einladung");
    if(einlUrl){sessionStorage.setItem("adler_einladung",einlUrl);history.replaceState({},"",location.pathname+"?portal");}
  }catch(e){}
  let einl=null; try{einl=sessionStorage.getItem("adler_einladung");}catch(e){}
  /* War die Kabine aktiv (Kids-Modus), legt sich sofort ein Vorhang darueber: sonst sieht
     das Kind nach einem Reload eine Sekunde lang das Eltern-Dashboard. kabineOpen entfernt
     ihn; die Sicherung raeumt ihn weg, falls doch der Login erscheint. */
  try{
    if(!einl&&localStorage.getItem("adler_kabine_aktiv")==="1"&&sbToken()&&!document.getElementById("kabine-splash")){
      const sp=document.createElement("div"); sp.id="kabine-splash";
      sp.style.cssText="position:fixed;inset:0;z-index:10052;background:linear-gradient(160deg,#0f172a,#1e3a8a);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:inherit";
      sp.innerHTML='<div style="font-size:52px">🦅</div><div style="font-size:var(--s-karte);font-weight:800">Kabine wird geöffnet…</div>';
      document.body.appendChild(sp);
      setTimeout(()=>{document.getElementById("kabine-splash")?.remove();},12000);
    }
  }catch(e){}
  let root=document.getElementById("eltern-portal");
  if(!root){root=document.createElement("div");root.id="eltern-portal";root.style.cssText="min-height:100vh;background:#f1f5f9;font-family:inherit;padding:16px";document.body.appendChild(root);}
  // UX 5 (Forever-Login): access_token abgelaufen, aber refresh_token noch gültig? Still erneuern,
  // bevor wir zum OTP-Login zurückfallen – Eltern bleiben praktisch dauerhaft eingeloggt.
  if(!sbToken()){const s=sbSession();if(s&&s.refresh_token){root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade…</div>';await sbRefreshToken();}}
  if(einl)return elternEinladungView(root,einl);
  if(sbToken()){
    root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade…</div>';
    const role=await authRole();
    if(role==="parent")return elternPortalDashboard(root);
    if(role==="trainer")return elternPortalTrainerNotice(root);
    if(_authOffline){ root.innerHTML='<div style="text-align:center;padding:48px 20px;color:var(--text2);font-size:var(--s-karte)">📶 Gerade kein Internet.<br><br><button class="btn" style="min-height:48px" onclick="renderElternPortal()">Nochmal versuchen</button></div>'; return; }   // v636: nicht abmelden, nur weil das Netz fehlt
    localStorage.removeItem(SB_TOKEN_KEY_ELTERN); // Session ohne Profil/Rolle → verwerfen
  }
  elternPortalLogin(root);
}
/* v604: Zwei Wege, einer davon ohne E-Mail-Versand. Zuerst E-Mail und Passwort; der
   Einmal-Code bleibt fuer aeltere Konten ohne Passwort und fuer „Passwort vergessen“. */
const EP_FELD="width:100%;padding:11px;margin:6px 0 12px;border:1px solid var(--rand-bedien);border-radius:10px;font-size:var(--s-karte);box-sizing:border-box";
const EP_KNOPF="width:100%;min-height:46px;padding:13px;border:none;border-radius:10px;color:#fff;font-size:var(--s-karte);font-weight:700;cursor:pointer";
const EP_LINK="width:100%;min-height:44px;padding:9px;margin-top:6px;border:none;background:none;color:#475569;font-size:var(--s-text);cursor:pointer;text-decoration:underline";
function elternPortalKopf(){
  return `<div style="text-align:center;font-size:40px">🦅</div>
    <div style="text-align:center;font-size:var(--s-teil);font-weight:800;margin-top:6px">Eltern-Bereich</div>
    <div style="text-align:center;font-size:var(--s-text);color:#475569;margin:6px 0 18px">SV Adler Dellbrück U9</div>`;
}
function elternPortalLogin(root,vorEmail){
  root.innerHTML=`<div style="max-width:360px;margin:7vh auto 0;background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.1)">
    ${elternPortalKopf()}
    <form id="ep-step-pw" onsubmit="event.preventDefault();elternPortalPasswort()">
      <label for="ep-email" style="font-size:var(--s-text);color:#475569">E-Mail-Adresse</label>
      <input id="ep-email" type="email" inputmode="email" autocomplete="username" placeholder="name@mail.de" style="${EP_FELD}">
      <label for="ep-pw" style="font-size:var(--s-text);color:#475569">Passwort</label>
      <input id="ep-pw" type="password" autocomplete="current-password" style="${EP_FELD}">
      <button id="ep-login" type="submit" style="${EP_KNOPF};background:#1e3a8a">Anmelden</button>
      <button type="button" onclick="elternPortalCodeWeg()" style="${EP_LINK}">Noch kein Passwort oder vergessen? Code per E-Mail</button>
    </form>
    <div id="ep-step-email" style="display:none">
      <div style="font-size:var(--s-text);color:#475569;margin-bottom:8px">Wir schicken dir einen Anmelde-Code. Im Eltern-Bereich kannst du danach ein Passwort festlegen.</div>
      <label for="ep-email2" style="font-size:var(--s-text);color:#475569">E-Mail-Adresse</label>
      <input id="ep-email2" type="email" inputmode="email" autocomplete="email" placeholder="name@mail.de" style="${EP_FELD}">
      <button id="ep-send" onclick="elternPortalSend()" style="${EP_KNOPF};background:#1e3a8a">Code anfordern</button>
      <button onclick="elternPortalHaveCode()" style="${EP_LINK}">Code schon erhalten? → eingeben</button>
      <button onclick="elternPortalLogin(document.getElementById('eltern-portal'))" style="${EP_LINK}">← mit Passwort anmelden</button>
    </div>
    <div id="ep-step-code" style="display:none">
      <div style="font-size:var(--s-text);color:#475569;margin-bottom:6px">Code aus der E-Mail an <b id="ep-email-show"></b>:</div>
      <input id="ep-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Code eingeben" aria-label="Code aus der E-Mail" style="width:100%;padding:11px;margin:6px 0 12px;border:1px solid var(--rand-bedien);border-radius:10px;font-size:var(--s-seite);letter-spacing:4px;text-align:center;box-sizing:border-box">
      <button id="ep-verify" onclick="elternPortalVerify()" style="${EP_KNOPF};background:#047857">Anmelden</button>
      <button onclick="elternPortalCodeWeg()" style="${EP_LINK}">← andere E-Mail</button>
    </div>
    <div id="ep-err" role="alert" style="font-size:var(--s-text);color:#b91c1c;min-height:16px;margin-top:10px;text-align:center"></div>
    <div style="font-size:var(--s-klein);color:#475569;text-align:center;margin-top:14px">Den Zugang gibt es mit der Einladungskarte vom Trainerteam – persönliche Angaben siehst du nur zu deinem eigenen Kind.</div>
  </div>`;
  if(vorEmail){const e=document.getElementById("ep-email");if(e)e.value=vorEmail;}
  if(typeof elternThemeInit==="function"){ elternThemeInit(); elternThemeSweep(root); } // Login-Screen dem Theme folgen lassen
}
function elternPortalCodeWeg(){
  const mail=(document.getElementById("ep-email")?.value||document.getElementById("ep-email2")?.value||epEmail||"").trim();
  ["ep-step-pw","ep-step-code"].forEach(id=>{const x=document.getElementById(id);if(x)x.style.display="none";});
  const st=document.getElementById("ep-step-email");if(st)st.style.display="";
  const e2=document.getElementById("ep-email2");if(e2){if(mail)e2.value=mail;e2.focus();}
  const err=document.getElementById("ep-err");if(err)err.textContent="";
}
async function elternPortalPasswort(){
  const email=(document.getElementById("ep-email")?.value||"").trim().toLowerCase();
  const pw=document.getElementById("ep-pw")?.value||"";
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!/.+@.+\..+/.test(email)){if(err)err.textContent="Bitte eine gültige E-Mail eingeben";return;}
  if(!pw){if(err)err.textContent="Bitte das Passwort eingeben";return;}
  const btn=document.getElementById("ep-login");if(btn){btn.disabled=true;btn.textContent="Prüfe…";}
  try{
    await authPasswortLogin(email,pw);
    document.getElementById("eltern-portal")?.remove();
    renderElternPortal();
  }catch(e){if(err)err.textContent=e.message;if(btn){btn.disabled=false;btn.textContent="Anmelden";}}
}
async function elternPortalSend(){
  const email=document.getElementById("ep-email2")?.value.trim().toLowerCase();
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!email||!/.+@.+\..+/.test(email)){if(err)err.textContent="Bitte eine gültige E-Mail eingeben";return;}
  const btn=document.getElementById("ep-send");if(btn){btn.disabled=true;btn.textContent="Sende…";}
  try{
    // Whitelist-Gate: nur vom Trainer hinterlegte E-Mails dürfen einen Code anfordern (Anti-Spam).
    let ok=true;
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/is_email_whitelisted`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_email:email})});if(r.ok)ok=await r.json();}catch(e){}
    if(!ok){if(err)err.textContent="Diese E-Mail ist noch nicht freigeschaltet. Mit der Einladungskarte vom Trainerteam geht es sofort.";if(btn){btn.disabled=false;btn.textContent="Code anfordern";}return;}
    await authOtpRequest(email);
    epEmail=email;
    document.getElementById("ep-step-email").style.display="none";
    document.getElementById("ep-step-code").style.display="";
    document.getElementById("ep-email-show").textContent=email;
    document.getElementById("ep-code")?.focus();
  }catch(e){if(err)err.textContent=e.message;}
  finally{if(btn){btn.disabled=false;btn.textContent="Code anfordern";}}
}
// Direkt zur Code-Eingabe, ohne neu anzufordern (z. B. bei Rate-Limit oder Code schon in der Inbox).
function elternPortalHaveCode(){
  const email=document.getElementById("ep-email2")?.value.trim().toLowerCase();
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!email||!/.+@.+\..+/.test(email)){if(err)err.textContent="Bitte zuerst deine E-Mail eingeben";return;}
  epEmail=email;
  document.getElementById("ep-step-email").style.display="none";
  document.getElementById("ep-step-code").style.display="";
  document.getElementById("ep-email-show").textContent=email;
  document.getElementById("ep-code")?.focus();
}
async function elternPortalVerify(){
  const code=(document.getElementById("ep-code")?.value||"").replace(/\D/g,""); // nur Ziffern, Leerzeichen raus
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!code||code.length<6){if(err)err.textContent="Bitte den Code aus der E-Mail eingeben";return;}
  const btn=document.getElementById("ep-verify");if(btn){btn.disabled=true;btn.textContent="Prüfe…";}
  try{
    await authOtpVerify(epEmail,code);
    document.getElementById("eltern-portal")?.remove();
    renderElternPortal();
  }catch(e){if(err)err.textContent=e.message;if(btn){btn.disabled=false;btn.textContent="Anmelden";}}
}
function elternPortalLogout(){ localStorage.removeItem(SB_TOKEN_KEY_ELTERN); try{localStorage.removeItem("adler_rolle");localStorage.removeItem("adler_dsgvo_v");}catch(e){} document.getElementById("eltern-portal")?.remove(); renderElternPortal(); }
/* ═══ v604: Einladungskarte ═══
   Die Karte traegt einen QR-Code auf eltern/?portal&einladung=CODE. renderElternPortal
   puffert den Code und ruft hierher. Die Edge Function eltern-einladung prueft ihn und
   legt das Konto an – bestaetigt, ohne Mail. Danach meldet sich die Seite mit genau dem
   eben gewaehlten Passwort an, und die Eltern stehen im Dashboard. */
function elternEinladungFn(body){
  const t=sbToken();
  return fetch(`${SB_URL}/functions/v1/eltern-einladung`,{method:"POST",
    headers:{'apikey':SB_KEY,'Authorization':'Bearer '+(t||SB_KEY),'Content-Type':'application/json'},
    body:JSON.stringify(body)}).then(async r=>{const d=await r.json().catch(()=>({}));return {status:r.status,...d};});
}
function elternEinladungVergessen(){ try{sessionStorage.removeItem("adler_einladung");}catch(e){} }
function elternEinladungRahmen(root,inhalt){
  root.innerHTML=`<div style="max-width:380px;margin:5vh auto 0;background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.1)">
    ${elternPortalKopf()}${inhalt}
    <div id="einl-err" role="alert" style="font-size:var(--s-text);color:#b91c1c;min-height:16px;margin-top:10px;text-align:center"></div>
  </div>`;
  if(typeof elternThemeInit==="function"){ elternThemeInit(); elternThemeSweep(root); }
}
async function elternEinladungView(root,code){
  elternEinladungRahmen(root,'<div style="text-align:center;color:#475569">Einladung wird geprüft…</div>');
  let info;
  try{info=await elternEinladungFn({aktion:"pruefen",code});}
  catch(e){info={ok:false,fehler:"Keine Verbindung. Bitte WLAN oder mobile Daten prüfen und die Seite neu laden."};}
  if(!info||!info.ok){
    elternEinladungRahmen(root,`<div style="font-size:var(--s-karte);font-weight:800;text-align:center;margin-bottom:8px">Das hat nicht geklappt</div>
      <div style="font-size:var(--s-text);color:#334155;text-align:center">${esc((info&&info.fehler)||"Die Karte konnte nicht geprüft werden.")}</div>
      <button onclick="elternEinladungVergessen();renderElternPortal()" style="${EP_KNOPF};background:#1e3a8a;margin-top:16px">Zur Anmeldung</button>`);
    return;
  }
  window._einlCode=code; window._einlVorname=info.vorname||"";
  const fuer=info.vorname?`die Familie von <b>${esc(info.vorname)}</b>`:"eure Familie";   // v710: „Einladung für die eure Familie“
  let rolle=null; if(sbToken())rolle=await authRole();
  if(rolle==="parent"||rolle==="trainer"){
    elternEinladungRahmen(root,`<div style="font-size:var(--s-karte);font-weight:800;text-align:center">Willkommen bei der U9!</div>
      <div style="font-size:var(--s-text);color:#334155;text-align:center;margin:8px 0 14px">Einladung für ${fuer}.<br>Du bist schon angemeldet als <b>${esc(sbEmail()||"")}</b>.</div>
      <button id="einl-ok" onclick="elternEinladungEinloesen()" style="${EP_KNOPF};background:#047857">Mit diesem Konto verbinden</button>
      <button onclick="elternEinladungAbmelden()" style="${EP_LINK}">Anderes Konto verwenden</button>`);
    return;
  }
  elternEinladungRahmen(root,`<div style="font-size:var(--s-karte);font-weight:800;text-align:center">Willkommen bei der U9!</div>
    <div style="font-size:var(--s-text);color:#334155;text-align:center;margin:8px 0 16px">Einladung für ${fuer}. Leg dir hier deinen Zugang an – das dauert eine Minute.</div>
    <form onsubmit="event.preventDefault();elternEinladungEinloesen()">
      <label for="einl-email" style="font-size:var(--s-text);color:#475569">Deine E-Mail-Adresse</label>
      <input id="einl-email" type="email" inputmode="email" autocomplete="username" placeholder="name@mail.de" style="${EP_FELD}">
      <label for="einl-pw" style="font-size:var(--s-text);color:#475569">Passwort festlegen (${pwRegelText()})</label>
      <input id="einl-pw" type="password" autocomplete="new-password" minlength="10" style="${EP_FELD}">
      <label for="einl-pw2" style="font-size:var(--s-text);color:#475569">Passwort wiederholen</label>
      <input id="einl-pw2" type="password" autocomplete="new-password" minlength="10" style="${EP_FELD}">
      <button id="einl-ok" type="submit" style="${EP_KNOPF};background:#047857">Zugang anlegen</button>
    </form>
    <button onclick="elternEinladungMitKonto()" style="${EP_LINK}">Ich habe schon ein Konto</button>
    <div style="font-size:var(--s-klein);color:#475569;text-align:center;margin-top:8px">Mit dieser Karte können sich zwei Elternteile anmelden, jede Person mit eigener E-Mail.</div>`);
  document.getElementById("einl-email")?.focus();
}
function elternEinladungAbmelden(){ localStorage.removeItem(SB_TOKEN_KEY_ELTERN); renderElternPortal(); }
/* Wer schon ein Konto hat, meldet sich normal an; die Einladung bleibt im Puffer und
   erscheint nach der Anmeldung als „Mit diesem Konto verbinden“. */
function elternEinladungMitKonto(){ const root=document.getElementById("eltern-portal"); if(root)elternPortalLogin(root); }
async function elternEinladungEinloesen(){
  const err=document.getElementById("einl-err");if(err)err.textContent="";
  const code=window._einlCode; if(!code)return renderElternPortal();
  const angemeldet=!!sbToken();
  let email="",pw="";
  if(!angemeldet){
    email=(document.getElementById("einl-email")?.value||"").trim().toLowerCase();
    pw=document.getElementById("einl-pw")?.value||"";
    const pw2=document.getElementById("einl-pw2")?.value||"";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){if(err)err.textContent="Bitte eine gültige E-Mail-Adresse eingeben.";return;}
    {const f=pwRegelFehler(pw);if(f){if(err)err.textContent=f;return;}}
    if(pw!==pw2){if(err)err.textContent="Die beiden Passwörter sind nicht gleich.";return;}
  }
  const btn=document.getElementById("einl-ok");if(btn){btn.disabled=true;btn.textContent="Einen Moment…";}
  const fertig=t=>{if(btn){btn.disabled=false;btn.textContent=t;}};
  let r;
  try{r=await elternEinladungFn({aktion:"einloesen",code,email,passwort:pw});}
  catch(e){r={ok:false,fehler:"Keine Verbindung. Bitte gleich noch einmal versuchen."};}
  if(!r||!r.ok){if(err)err.textContent=(r&&r.fehler)||"Das hat nicht geklappt.";fertig(angemeldet?"Mit diesem Konto verbinden":"Zugang anlegen");return;}
  elternEinladungVergessen();
  const root=document.getElementById("eltern-portal");
  if(angemeldet){ if(typeof toast==="function")toast("✅ Verbunden"); return renderElternPortal(); }
  if(r.bestehend){
    /* Die Adresse hatte schon ein Konto. Ein fremdes Passwort setzt die Funktion nie –
       das Kind ist zugeordnet, anmelden geht wie bisher. */
    if(root){elternPortalLogin(root,email);const e=document.getElementById("ep-err");if(e){e.style.color="#047857";e.textContent="Für diese E-Mail gibt es schon ein Konto – das Kind ist jetzt zugeordnet. Bitte mit deinem Passwort anmelden oder unten einen Code anfordern.";}}
    return;
  }
  try{ await authPasswortLogin(email,pw); }
  catch(e){ if(root){elternPortalLogin(root,email);} return; }
  document.getElementById("eltern-portal")?.remove();
  renderElternPortal();
}
/* v604: Passwort festlegen oder aendern – fuer Konten aus der Zeit vor den Karten (nur
   Einmal-Code) und fuer „Passwort vergessen“: Code anfordern, anmelden, hier neu setzen.
   Eigenes Overlay statt prompt() (CLAUDE.md: keine Systemdialoge im Eltern-Bereich). */
function elternPasswortOpen(){
  document.getElementById("ep-pw-modal")?.remove();
  const m=document.createElement("div");m.id="ep-pw-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Passwort festlegen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10040;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<form onsubmit="event.preventDefault();elternPasswortSpeichern()" style="background:#fff;color:#1a1a2e;border-radius:16px;padding:20px;max-width:360px;width:100%">
    <div style="font-size:var(--s-karte);font-weight:800;margin-bottom:4px">🔑 Passwort festlegen</div>
    <div style="font-size:var(--s-text);color:#475569;margin-bottom:10px">Danach kannst du dich mit E-Mail und Passwort anmelden – auch auf einem zweiten Gerät.</div>
    <label for="ep-neu1" style="font-size:var(--s-text);color:#475569">Neues Passwort (${pwRegelText()})</label>
    <input id="ep-neu1" type="password" autocomplete="new-password" minlength="10" style="${EP_FELD}">
    <label for="ep-neu2" style="font-size:var(--s-text);color:#475569">Wiederholen</label>
    <input id="ep-neu2" type="password" autocomplete="new-password" minlength="10" style="${EP_FELD}">
    <div id="ep-neu-err" role="alert" style="font-size:var(--s-text);color:#b91c1c;min-height:16px;margin-bottom:6px"></div>
    <button id="ep-neu-ok" type="submit" style="${EP_KNOPF};background:#1e3a8a">Speichern</button>
    <button type="button" onclick="document.getElementById('ep-pw-modal').remove()" style="${EP_LINK}">Abbrechen</button>
  </form>`;
  document.body.appendChild(m);
  document.getElementById("ep-neu1")?.focus();
}
async function elternPasswortSpeichern(){
  const a=document.getElementById("ep-neu1")?.value||"", b=document.getElementById("ep-neu2")?.value||"";
  const err=document.getElementById("ep-neu-err");if(err)err.textContent="";
  {const f=pwRegelFehler(a);if(f){if(err)err.textContent=f;return;}}
  if(a!==b){if(err)err.textContent="Die beiden Passwörter sind nicht gleich.";return;}
  const btn=document.getElementById("ep-neu-ok");if(btn){btn.disabled=true;btn.textContent="Speichere…";}
  try{
    const r=await fetch(`${SB_URL}/auth/v1/user`,{method:"PUT",headers:{...sbAuthHeaders(),'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({password:a})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      const m=String(d.msg||d.error_description||d.error||"");
      throw new Error(/different from the old|same_password/i.test(m)?"Das ist schon dein Passwort.":/reauth/i.test(m)?"Bitte einmal ab- und mit Code neu anmelden, dann klappt es.":authFehlerDeutsch(m,"Konnte nicht gespeichert werden."));
    }
    document.getElementById("ep-pw-modal")?.remove();
    if(typeof toast==="function")toast("✅ Passwort gespeichert");
  }catch(e){if(err)err.textContent=e.message;if(btn){btn.disabled=false;btn.textContent="Speichern";}}
}
function elternPortalDashboard(root){
  root.innerHTML=`<div class="ep-wrap">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;padding:8px 4px 12px">
      <div style="font-size:var(--s-teil);font-weight:800">🦅 Eltern-Bereich</div>
      <div style="display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap">
        <button type="button" id="rufe-kopf" onclick="rufeEinstieg()" title="Adler-Rufe – der Team-Chat" aria-label="Adler-Rufe öffnen" style="position:relative;border:1.5px solid var(--rand-bedien);background:#fff;color:#334155;border-radius:8px;width:44px;height:44px;cursor:pointer;font-size:var(--s-karte);line-height:1">💬<span class="rufe-badge" style="display:none;position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;font-size:var(--s-klein);font-weight:800;align-items:center;justify-content:center;border:2px solid #fff;box-sizing:border-box"></span></button>
        <button class="schrift-toggle" onclick="schriftWechseln()" aria-label="Schriftgröße umschalten" style="min-width:44px;height:44px;background:#fff;color:#334155;border:1.5px solid var(--rand-bedien)">A</button>
        <button id="theme-toggle" onclick="toggleTheme()" title="Hell / Dunkel umschalten" aria-label="Theme umschalten" style="border:1.5px solid var(--rand-bedien);background:#fff;color:#334155;border-radius:8px;width:44px;height:44px;cursor:pointer;font-size:var(--s-karte);line-height:1">🌙</button>
        <button onclick="elternTourStart()" title="Kurze Tour" aria-label="Hilfe/Tour" style="border:1.5px solid var(--rand-bedien);background:#fff;color:#334155;border-radius:8px;width:44px;height:44px;cursor:pointer;font-size:var(--s-karte);line-height:1">❓</button>
        <button onclick="elternPasswortOpen()" title="Passwort festlegen oder ändern" aria-label="Passwort festlegen oder ändern" style="border:1.5px solid var(--rand-bedien);background:#fff;color:#334155;border-radius:8px;width:44px;height:44px;cursor:pointer;font-size:var(--s-karte);line-height:1">🔑</button>
        <button onclick="elternPortalLogout()" style="border:none;background:none;color:var(--text2);font-size:var(--s-text);cursor:pointer;min-height:44px;padding:0 6px">Abmelden</button>
      </div>
    </div>
    <div id="ep-dash-body"><div style="text-align:center;padding:40px;color:#64748b">Lade…</div></div>
  </div>`;
  if(typeof applyTheme==="function")applyTheme(localStorage.getItem("adler_theme")); // Toggle-Icon + data-theme
  if(typeof applySchrift==="function"){ try{ applySchrift(localStorage.getItem("adler_schrift")); }catch(e){} }   // v632: Knopf beschriften
  if(typeof schriftHinweisZeigen==="function"){ const hdr=root.querySelector(".ep-wrap"); if(hdr&&!document.getElementById("schrift-hinweis-eltern")){ const d=document.createElement("div"); d.id="schrift-hinweis-eltern"; const kopf=hdr.firstElementChild; kopf?kopf.after(d):hdr.prepend(d); schriftHinweisZeigen(d); } }   // v632: einmaliger Hinweis
  if(typeof elternThemeInit==="function"){ elternThemeInit(); elternThemeSweep(document.getElementById("eltern-portal")||document.body); } // Kopfzeile bei Dark einfärben
  dsgvoEnsureConsent(elternDashLoad); // Dashboard erst nach Datenschutz-Einwilligung laden
  if(typeof kabineGesperrt==="function"&&kabineGesperrt()&&typeof kabineSperre==="function")kabineSperre();   // v609: Kabinen-Zeit war abgelaufen – erst der Code öffnet
}
// Datenschutz-Einwilligung beim (ersten) Eltern-Login. Server-Nachweis in dsgvo_consent
// (user_id + Version + Zeitstempel). Bei neuer Version (Text-Update) → erneute Einwilligung.
const DSGVO_VERSION="1.1";   // v636: Text an die Technik angeglichen – alle stimmen einmal neu zu
async function dsgvoEnsureConsent(onOk){
  let has=false, netzFehler=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/dsgvo_consent?select=version&version=eq.${encodeURIComponent(DSGVO_VERSION)}`,{headers:sbAuthHeaders()});if(r.ok)has=((await r.json())||[]).length>0;else if(r.status>=500)netzFehler=true;}catch(e){netzFehler=true;}
  /* v636: Ohne Netz gilt die auf diesem Gerät schon gegebene Einwilligung (Nachweis bleibt in
     dsgvo_consent). Vorher erschien offline jedes Mal das Einwilligungsfenster, und „Zustimmen“
     scheiterte mit „Netzwerkfehler“ – das Dashboard war unerreichbar. */
  if(!has&&netzFehler){ try{ has=localStorage.getItem("adler_dsgvo_v")===DSGVO_VERSION; }catch(e){} }
  if(has){ try{localStorage.setItem("adler_dsgvo_v",DSGVO_VERSION);}catch(e){} }
  if(has){onOk();return;}
  dsgvoRenderGate(onOk);
}
/* Pflichtangaben fuers Einwilligungs-Gate. v636: Name und Mail wie auf der Vereinsseite
   (allgemeine Vereinsadresse, keine private). Der Link bleibt leer: die Datenschutzerklaerung
   der Vereins-Website beschreibt die Website, nicht diese App – ein Verweis darauf waere falsch. */
const VEREIN_DS={
  name:"SV Adler Dellbrück 1922 e. V.",
  anschrift:"Thurner Kamp 97, 51069 Köln",
  mail:"info@adlerdellbrueck.de",
  link:""
};
function dsgvoRenderGate(onOk){
  const body=document.getElementById("ep-dash-body"); if(!body){onOk();return;}
  window._dsgvoOnOk=onOk;
  body.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;font-size:var(--s-text);line-height:1.55;color:#334155">
    <div style="font-size:var(--s-karte);font-weight:800;color:#1a1a2e;margin-bottom:6px">Datenschutz & Einwilligung</div>
    <p style="margin:0 0 8px">Bevor du den Eltern-Bereich nutzt, bitten wir um deine Einwilligung. So gehen wir mit euren Daten um:</p>
    <ul style="margin:0 0 8px 18px;padding:0">
      <li><b>Wozu:</b> Organisation des Trainings- und Spielbetriebs der U9 (Termine, Rückmeldungen, Aufstellung, altersgerechte Förderung).</li>
      <li><b>Zugang:</b> nur per persönlichem Login (E-Mail mit eigenem Passwort oder Einmal-Code). Die Datenbank prüft bei jeder Anfrage, wer fragt – nicht die App.</li>
      <li><b>Nur für euch und das Trainerteam:</b> Notfallkarte, Rückmeldungen, Foto-Freigaben und die Karte eures Kindes. Einschätzungen des Trainerteams bekommt ihr in Worten, nie als Zahl oder Rangliste – auch Kinder sehen keine Zahlen.</li>
      <li><b>Im Team sichtbar</b> (für angemeldete Eltern und die Kabine): Vornamen und Trikotnummern, Helfer- und Fahrgemeinschaftslisten, Fotos nur mit eurer Freigabe.</li>
      <li><b>Fotos:</b> in einem privaten Speicher, nur mit ausdrücklicher Freigabe je Kind in drei Stufen (App-intern, Video, öffentlich; Standard: aus). Auf öffentlichen Seiten und im Adler Nest nur mit der Stufe „öffentlich“ – dort zusammen mit Vorname, Anfangsbuchstabe des Nachnamens und Jahrgang, nie mit dem Geburtsdatum.</li>
      <li><b>Keine Weitergabe:</b> keine Werbung, kein Verkauf; keine Zahlungs-/Kontodaten in der App.</li>
      <li><b>Technik und Dienste:</b> Datenbank bei Supabase in Frankfurt (EU); die App-Dateien samt Schrift und Symbolen kommen von GitHub Pages – kein Aufruf bei Google Fonts oder anderen Schriftdiensten; Wetter über open-meteo, Karten über OpenStreetMap (nur Orts- und Termindaten); Push-Mitteilungen über den Dienst eures Browsers (ohne Kindernamen).</li>
      <li><b>KI:</b> Das Trainerteam nutzt einen KI-Dienst (Anbieter in den USA) als Schreibhilfe für Nachbereitung und Berichte. Kindernamen werden vorher durch „Kind 1“, „Kind 2“ ersetzt und erst auf dem Gerät des Trainers zurückübersetzt.</li>
    </ul>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:var(--s-klein);color:#475569;margin:8px 0">
      <b>Verantwortlich:</b> ${esc(VEREIN_DS.name)}, ${esc(VEREIN_DS.anschrift)}.
      <b>Rechtsgrundlage:</b> deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO; für Gesundheitsangaben der Notfallkarte Art. 9 Abs. 2 lit. a DSGVO).
      <b>Speicherdauer:</b> bis zum Saisonende bzw. bis dein Kind das Team verlässt; Einschätzungen des Trainerteams werden zum Saisonwechsel archiviert (nur Trainerteam), Sicherungskopien bis zu zehn Wochen.
      Auskunft, Löschung und Widerruf sind jederzeit möglich – unter „Datenschutz &amp; Freigaben“ mit einem Knopf oder beim Trainerteam${VEREIN_DS.mail?` oder schreib an <a href="mailto:${esc(VEREIN_DS.mail)}" style="color:#1d4ed8">${esc(VEREIN_DS.mail)}</a>`:""}.
      ${VEREIN_DS.link?`<a href="${esc(VEREIN_DS.link)}" target="_blank" rel="noopener" style="color:#1d4ed8">Vollständige Datenschutzerklärung</a>.`:""}
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;margin:10px 0;font-size:var(--s-text);cursor:pointer">
      <input type="checkbox" id="dsgvo-cb" style="margin-top:3px" onchange="var b=document.getElementById('dsgvo-ok');b.disabled=!this.checked;b.style.opacity=this.checked?'1':'.5'">
      <span>Ich habe die Hinweise gelesen und willige in die beschriebene Verarbeitung ein. Die Einwilligung kann ich jederzeit für die Zukunft widerrufen.</span>
    </label>
    <button id="dsgvo-ok" disabled onclick="dsgvoAccept()" style="width:100%;min-height:46px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer;opacity:.5">Zustimmen & fortfahren</button>
    <div style="text-align:center;margin-top:8px"><button onclick="elternPortalLogout()" style="border:none;background:none;color:#64748b;font-size:var(--s-text);cursor:pointer">Ablehnen & abmelden</button></div>
  </div>`;
}
async function dsgvoAccept(){
  const btn=document.getElementById("dsgvo-ok"); if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/dsgvo_consent`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({version:DSGVO_VERSION})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht speichern","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  try{localStorage.setItem("adler_dsgvo_v",DSGVO_VERSION);}catch(e){}
  toast("Danke – Einwilligung gespeichert ✓");
  const ok=window._dsgvoOnOk; window._dsgvoOnOk=null; if(typeof ok==="function")ok();
}
/* v708: Weiß auf #059669 hatte 3,8:1, auf #ca8a04 2,9:1 – die Töne tragen weiße Schrift und
   stehen als Schrift auf Weiß; beides braucht 4,5:1. */
const EP_RSVP={zugesagt:{lbl:"Zusage",emo:"👍",col:"#047857"},unsicher:{lbl:"Unsicher",emo:"🤔",col:"#a16207"},abgesagt:{lbl:"Absage",emo:"👎",col:"#dc2626"},krank:{lbl:"Krank",emo:"🤒",col:"#b45309"}};
// Schnell-Rückmeldung im Karussell: die drei vom PO gewünschten Stufen.
const EP_RSVP_QUICK=["zugesagt","unsicher","abgesagt"];
/* ── Tag/Nacht-Modus für den Eltern-Bereich ──────────────────────────────────
   Der Eltern-Bereich ist mit festen Hell-Farben (Inline-Styles) gebaut und reagiert
   – anders als die Trainer-App – nicht auf die CSS-Variablen. Statt hunderte Literale
   umzuschreiben, färbt ein zentraler, luminanz-basierter „Sweep" ein: sehr helle
   Flächen → dunkel, sehr dunkler Text → hell. Marken-/Akzentfarben (mittlere Helligkeit)
   bleiben. Läuft nur bei aktivem Dark-Theme, ist idempotent und erfasst per
   MutationObserver auch später geöffnete Modals/Slots. Body-Hintergrund kommt schon
   aus var(--bg) und ist damit ohnehin theme-fähig. */
function elternDarkActive(){
  const a=document.documentElement.getAttribute("data-theme");
  if(a==="dark")return true; if(a==="light")return false;
  return !!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function _elRgb(s){ const m=/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(s||""); if(!m)return null; const a=m[4]==null?1:parseFloat(m[4]); return a===0?null:[+m[1],+m[2],+m[3]]; }
function _elLum(c){ return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
function _elMix(c,t,p){ return `rgb(${Math.round(c[0]+(t[0]-c[0])*p)}, ${Math.round(c[1]+(t[1]-c[1])*p)}, ${Math.round(c[2]+(t[2]-c[2])*p)})`; }
function _elSweepOne(el){
  const s=el.style, d=el.dataset; if(!s)return;
  if(d.elSwept||d.elFest)return;   // schon eingefärbt – Original in data-el-* bleibt gesichert; data-el-fest: Farben stimmen in beiden Modi (v614)
  let changed=false;
  const bg=_elRgb(s.backgroundColor);
  if(bg&&_elLum(bg)>216){ d.elBg=s.backgroundColor; s.backgroundColor=_elMix(bg,[17,24,39],0.90); changed=true; }   // helle Fläche → dunkel
  const col=_elRgb(s.color);
  if(col){ const L=_elLum(col);
    if(L<60){ d.elCol=s.color; s.color=_elMix(col,[226,232,240],0.86); changed=true; }        // fast-schwarze Tinte → deutlich hell
    else if(L<128){ d.elCol=s.color; s.color=_elMix(col,[226,232,240],0.62); changed=true; }   // dunkle Marken-/Textfarbe → aufhellen (v614: 0,5 blieb bei 4,4:1 hängen)
  }
  ["Top","Right","Bottom","Left"].forEach(side=>{ const p="border"+side+"Color";
    const b=_elRgb(s[p]); if(b&&_elLum(b)>205){ d["elB"+side]=s[p]; s[p]=_elMix(b,[51,65,85],0.72); changed=true; }
    /* v708: dunkle Markenränder (#1e3a8a, #7c3aed, #1a56db) verschwanden auf dunklem Grund (1,3–2,4:1) – aufhellen. */
    else if(b&&_elLum(b)<100){ d["elB"+side]=s[p]; s[p]=_elMix(b,[226,232,240],0.55); changed=true; }
  });
  if(changed)d.elSwept="1";
}
/* Zurücksetzen bei Dunkel→Hell: der Sweep hat Inline-Farben überschrieben (Original in
   data-el-* gesichert). Deckt auch Kopfzeile/Rahmen ab, die elternDashLoad NICHT neu
   rendert – dort blieb der Hintergrund sonst dunkel hängen (Toggle-Bug). */
function _elUnsweepOne(el){
  const s=el.style, d=el.dataset; if(!s||!d.elSwept)return;
  if("elBg" in d){ s.backgroundColor=d.elBg; delete d.elBg; }
  if("elCol" in d){ s.color=d.elCol; delete d.elCol; }
  ["Top","Right","Bottom","Left"].forEach(side=>{ const k="elB"+side; if(k in d){ s["border"+side+"Color"]=d[k]; delete d[k]; } });
  delete d.elSwept;
}
function elternThemeRestore(root){
  root=root||document.body; if(!root||root.nodeType!==1)return;
  if(root.dataset&&root.dataset.elSwept)_elUnsweepOne(root);
  const list=root.querySelectorAll?root.querySelectorAll("[data-el-swept]"):[];
  for(const el of list)_elUnsweepOne(el);
}
function elternThemeSweep(root){
  if(!elternDarkActive())return;
  root=root||document.body; if(!root||root.nodeType!==1)return;
  if(root.hasAttribute&&root.hasAttribute("style"))_elSweepOne(root);
  const list=root.querySelectorAll?root.querySelectorAll("[style]"):[];
  for(const el of list)_elSweepOne(el);
}
let _elThemeObs=null;
function elternThemeInit(){
  if(_elThemeObs||!document.body)return;
  _elThemeObs=new MutationObserver(muts=>{
    if(!elternDarkActive())return;
    for(const mu of muts) for(const n of mu.addedNodes) if(n.nodeType===1) elternThemeSweep(n);
  });
  _elThemeObs.observe(document.body,{childList:true,subtree:true});
}
// Wird vom globalen toggleTheme (core.js) aufgerufen.
function elternThemeOnToggle(){
  if(!document.getElementById("ep-dash-body"))return;      // nur im Eltern-Dashboard
  if(typeof applyTheme==="function")applyTheme(localStorage.getItem("adler_theme")); // Toggle-Icon
  if(elternDarkActive())elternThemeSweep(document.body);   // dunkel: direkt einfärben
  else { elternThemeRestore(document.body); if(typeof elternDashLoad==="function")elternDashLoad(); } // hell: Inline-Farben überall zurücksetzen (auch Kopfzeile) + Dashboard neu
}
/* Kategorie-Fenster: die Panels liegen (versteckt) im #el-cat-overlay im DOM (damit die
   Async-Loader ihre Slots füllen); der Button zeigt nur das gewählte Panel im Vollbild-Overlay. */
function elternCatOpen(id){
  const ov=document.getElementById("el-cat-overlay"); if(!ov)return;
  if(typeof nutzungLog==="function")nutzungLog("eltern-bereich",id);
  const T={todo:"📌 Zu erledigen",news:"📣 Adler News",mehr:"📰 Mehr vom Team",regeln:"📋 Regeln & Vereinbarungen",datenschutz:"🔒 Datenschutz & Freigaben",kontakt:"🗣️ Trainerteam kontaktieren"};
  ov.querySelectorAll(".el-cat-panel").forEach(p=>p.style.display="none");
  const panel=document.getElementById("cat-"+id); if(panel)panel.style.display="block";
  const ttl=document.getElementById("el-cat-title"); if(ttl)ttl.textContent=T[id]||(panel&&panel.dataset&&panel.dataset.catTitle)||""; // Kind-Panels tragen ihren Titel selbst
  ov.style.display="block"; ov.scrollTop=0;
  /* v708: Das Fenster liegt schon beim Laden im DOM – der Beobachter in core.js sieht es nie
     „neu“ und kennzeichnete es nicht. Deshalb hier: Dialog, Name, Fokus hinein. */
  ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label",(ttl&&ttl.textContent)||"Bereich");
  if(!ov.hasAttribute("tabindex"))ov.setAttribute("tabindex","-1"); try{ov.focus({preventScroll:true});}catch(e){}
  try{history.pushState({elCat:id},"");}catch(e){} // Zurück-Taste schließt das Fenster (Back-Handler in core.js)
  if(id==="news"&&typeof elternNewsMarkSeen==="function")elternNewsMarkSeen(); // Öffnen = gelesen
  if(typeof elternDarkActive==="function"&&elternDarkActive()&&typeof elternThemeSweep==="function")elternThemeSweep(ov);
}
function elternCatClose(fromPop){
  const ov=document.getElementById("el-cat-overlay"); if(ov)ov.style.display="none";
  // Gelesene News: der Knopf geht mit dem Schließen, nicht schon beim Öffnen (v407).
  const nb=document.getElementById("eltern-news-btn");
  if(nb&&nb.dataset.gelesen==="1"){ nb.style.display="none"; delete nb.dataset.gelesen; }
  // Beim Schließen per ←-Button den History-Eintrag still verbrauchen (fromPop=true kommt
  // von der Zurück-Taste selbst – dann ist der Eintrag schon weg).
  if(!fromPop){ window._mdlSuppress=(window._mdlSuppress||0)+1; try{history.back();}catch(e){window._mdlSuppress--;} }
}
/* „Zu erledigen"-Button aus-/einblenden + Zähler: nur zeigen, wenn mind. ein Slot gefüllt ist. */
function elternTodoSync(){
  const btn=document.getElementById("eltern-todo-btn"); if(!btn)return;
  const n=["eltern-checklist-slot","helfer-todo-slot","eltern-poll-slot","mitbring-slot","buedchen-slot","puls-nudge-slot"].filter(id=>{const el=document.getElementById(id);return el&&el.innerHTML.trim().length>0;}).length;
  btn.style.display=n?"flex":"none";
  const b=document.getElementById("eltern-todo-badge"); if(b)b.textContent=n?String(n):"";
}
/* v716 (PO 02.10.): „… unter der Mannschaftskasse auch einen Hinweis im jeweiligen Elternzugang,
   ob mein Beitrag schon bezahlt ist oder ob er noch offen ist.“ Grundlage sind die Umlagen der
   Kasse und ihre Häkchen „Wer hat bezahlt“ (kasse_zahlung, RLS: nur die eigenen Kinder). Je aktive
   Umlage eine Zeile; bei mehreren Kindern mit Vorname. Ohne Umlage bleibt die Zeile leer. */
async function elternKasseKachelStand(kids, kasse){
  const el=document.getElementById("mk-beitrag-stand"); if(!el)return;
  const umlagen=(kasse&&Array.isArray(kasse.umlagen))?kasse.umlagen:[];
  if(!umlagen.length||!kids||!kids.length){ el.textContent=""; return; }
  let z=[]; try{const r=await fetch(`${SB_URL}/rest/v1/kasse_zahlung?select=umlage_id,spieler_id`,{headers:sbAuthHeaders()});if(r.ok)z=(await r.json())||[];}catch(e){return;}
  const viele=kids.length>1, eur=b=>Number(b||0).toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:2})+" €";
  const zeilen=[];
  umlagen.forEach(u=>kids.forEach(k=>{
    const ok=z.some(x=>Number(x.umlage_id)===Number(u.id)&&Number(x.spieler_id)===Number(k.spieler_id));
    const wer=viele?String((k.kader&&k.kader.name)||k.name||"").split(/\s+/)[0]+" · ":"";
    zeilen.push(`${wer}${esc(u.titel||"Beitrag")}: ${ok?"✓ bezahlt":"○ "+eur(u.betrag)+" offen"}`);
  }));
  el.innerHTML=zeilen.join("<br>");
}
/* 📣 Adler News: aggregiert „neu seit letztem Blick" (RPC eltern_news + Federn-Level je Kind).
   Gelesen-Status pro Quelle in localStorage adler_news_seen; Erstbesuch = Baseline (keine Flut). */
async function elternNewsLoad(kids){
  const panel=document.getElementById("cat-news"); if(!panel)return;
  let data=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/eltern_news`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)data=await r.json();}catch(e){}
  if(!data){ panel.innerHTML='<div style="background:#fff;border-radius:14px;padding:20px;text-align:center;color:var(--text3);font-size:var(--s-text)">Neuigkeiten offline nicht verfügbar.</div>'; return; }
  // aktuelle Werte je Quelle
  const cur={ nest:data.nest_at||"", boerse:data.boerse_at||"", fund:data.fund_at||"", skill:data.skill_at||"" };
  (data.lob||[]).forEach(l=>cur["lob_"+l.sid]=l.at);
  const federn={};
  await Promise.all((kids||[]).map(async k=>{ try{federn[k.spieler_id]=await xpTotal(k.spieler_id);}catch(e){federn[k.spieler_id]=0;} }));
  (kids||[]).forEach(k=>{ try{cur["level_"+k.spieler_id]=(xpBadge(federn[k.spieler_id]||0)||{}).t||"";}catch(e){} });
  // H7: Team-Meilensteine (RPC berechnet & persistiert; neuester Stand als Quelle "ms")
  let ms=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/team_meilensteine`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)ms=(await r.json())||[];}catch(e){}
  cur.ms=(ms[0]&&ms[0].erreicht_am)||"";
  // I-A: Adler-Post – neueste ungelesene Nachricht an die eigenen Kinder als News-Quelle
  try{const ids=(kids||[]).map(k=>k.spieler_id).join(",");
    if(ids){const r=await fetch(`${SB_URL}/rest/v1/kabine_post?an_spieler=in.(${ids})&select=created_at&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});
      if(r.ok){const p=((await r.json())||[])[0];cur.kpost=(p&&p.created_at)||"";}}}catch(e){}
  // J4: Trainings-Rückblick – was zuletzt geübt wurde (RPC, da trainingsplan trainer-only)
  let rueckblick=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/training_rueckblick`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rueckblick=(await r.json())||[];}catch(e){}
  cur.tr=(rueckblick[0]&&rueckblick[0].datum)||"";
  cur.wn=(typeof ELTERN_WHATSNEW!=="undefined"&&ELTERN_WHATSNEW.key)||""; // L2: „Was ist neu"
  /* v717: „Aus der Adlerschmiede“ – Eltern-Neuerungen aus der Tabelle adlerschmiede ersetzen die
     feste Liste. Schlüssel: Datum + laufende Nummer des neuesten Eintrags. */
  let schmiede=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/adlerschmiede?select=id,datum,emoji,text&order=datum.desc,id.desc&limit=12`,{headers:sbAuthHeaders()});if(r.ok)schmiede=(await r.json())||[];}catch(e){}
  window._adlerschmiede=schmiede;
  if(schmiede.length)cur.wn=String(schmiede[0].datum)+"-"+String(schmiede[0].id).padStart(6,"0");
  window._elternNewsCur=cur;
  let seen=null; try{seen=JSON.parse(localStorage.getItem("adler_news_seen")||"null");}catch(e){}
  if(!seen){ try{localStorage.setItem("adler_news_seen",JSON.stringify(cur));}catch(e){} seen=cur; } // Erstbesuch = Baseline
  const kidName=sid=>{const k=(kids||[]).find(x=>x.spieler_id===sid);return (k&&k.kader&&k.kader.name)||"Dein Kind";};
  const items=[];
  if(cur.nest&&cur.nest>(seen.nest||"")) items.push({emo:"📰",txt:"Das Adler Nest ist frisch erschienen.",act:`location.href='${location.pathname}?heft&von=app'`});
  if(cur.boerse&&cur.boerse>(seen.boerse||"")) items.push({emo:"🛍️",txt:"Neues in der Adler-Börse.",act:"elternCatClose();boerseOpen()"});
  if(cur.fund&&cur.fund>(seen.fund||"")) items.push({emo:"🧦",txt:"Neues im Fundbüro.",act:"elternCatClose();fundbueroOpen()"});
  if(cur.skill&&cur.skill.slice(0,4)!=="1970"&&cur.skill>(seen.skill||"")) items.push({emo:"🏅",txt:"Neuer Skill der Woche / neue Challenge.",act:"elternCatOpen('mehr')"});
  (data.lob||[]).forEach(l=>{ if(l.at>(seen["lob_"+l.sid]||"")) items.push({emo:"🎧",txt:`Neues Sprachlob für ${esc(kidName(l.sid))}.`,act:`elternCatClose();lobPlay(${l.sid})`}); });
  (kids||[]).forEach(k=>{ const lv=cur["level_"+k.spieler_id]; const sv=seen["level_"+k.spieler_id]; if(lv&&sv!=null&&lv!==sv) items.push({emo:"🎉",txt:`${esc(kidName(k.spieler_id))} hat ein neues Level erreicht: ${esc(lv)}!`,act:`elternCatClose();elternCardOpen(${k.spieler_id})`}); });
  if(cur.ms&&cur.ms>(seen.ms||"")) ms.filter(m=>m.erreicht_am>(seen.ms||"")).slice(0,3).forEach(m=>items.push({emo:"🏆",txt:`Team-Meilenstein: ${esc(m.label)}`,act:"elternCatClose()"})); // H7
  if(cur.kpost&&cur.kpost>(seen.kpost||"")) items.push({emo:"📬",txt:"Neue Adler-Post für dein Kind – Kompliment oder Gruß in der Kabine!",act:"elternCatClose();kabineOpen()"}); // I-A
  if(cur.tr&&cur.tr>(seen.tr||"")){ // J4: Gesprächsfutter für den Abendbrottisch
    const rb=rueckblick[0], heuteStr=isoLokal();
    const themen=(rb.themen||[]).slice(0,3).map(esc).join(", ");
    if(themen)items.push({emo:"📖",txt:`${rb.datum===heuteStr?"Heute":"Zuletzt"} im Training geübt: ${themen} – frag dein Kind doch mal danach!`,act:"elternCatClose()"});
  }
  if(cur.wn&&cur.wn>(seen.wn||"")){ // L2 → v717: ganz oben
    const neuSeit=schmiede.filter(e=>String(e.datum)+"-"+String(e.id).padStart(6,"0")>(seen.wn||"")).length;
    items.unshift(schmiede.length
      ?{emo:"🛠️",txt:`Aus der Adlerschmiede: ${neuSeit===1?"eine Neuerung":(neuSeit||schmiede.length)+" Neuerungen"} in eurer App – tippen!`,act:"schmiedeOpen()"}
      :{emo:"🆕",txt:`${esc(ELTERN_WHATSNEW.titel)} – tippen für die Highlights!`,act:"whatsNewOpen()"});
  }
  if(location.hash==="#adlerschmiede"&&schmiede.length){ try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} setTimeout(schmiedeOpen,300); }
  const badge=document.getElementById("eltern-news-badge");
  if(badge){ badge.textContent=items.length?String(items.length):"0"; badge.style.display=items.length?"inline-block":"none"; }
  // Der ganze Knopf verschwindet, wenn nichts Ungelesenes da ist (PO v407).
  const nbtn=document.getElementById("eltern-news-btn");
  if(nbtn)nbtn.style.display=items.length?"flex":"none";
  panel.innerHTML = items.length
    ? items.map(i=>`<button onclick="${i.act}" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:#fff;border:1px solid var(--rand-bedien);border-radius:12px;padding:12px;margin-bottom:8px;font-family:inherit;cursor:pointer"><span style="font-size:var(--s-teil);line-height:1">${i.emo}</span><span style="flex:1;font-size:var(--s-text);color:#334155;line-height:1.4">${i.txt}</span><span style="font-size:var(--s-karte);color:var(--text3)">›</span></button>`).join("")
    : '<div style="background:#fff;border-radius:14px;padding:24px;text-align:center;color:var(--text3);font-size:var(--s-text)">Aktuell nichts Neues 🦅</div>';
}
function elternNewsMarkSeen(){
  try{ if(window._elternNewsCur)localStorage.setItem("adler_news_seen",JSON.stringify(window._elternNewsCur)); }catch(e){}
  const b=document.getElementById("eltern-news-badge"); if(b){ b.textContent="0"; b.style.display="none"; }
  /* Der Knopf verschwindet erst beim Schließen: verschwände er unter dem Finger, während
     man noch liest, wäre der Weg zurück weg. Gelesen ist er ab jetzt trotzdem. */
  const btn=document.getElementById("eltern-news-btn"); if(btn)btn.dataset.gelesen="1";
}
/* L3: Saison-Chronik – das laufende Gedächtnis der Saison als Zeitstrahl: Spiele &
   Turniere mit Ergebnis, Events und Team-Meilensteine, nach Monaten gruppiert.
   (Wrapped ist der Jahresrückblick am Ende – die Chronik wächst jede Woche mit.) */
async function chronikOpen(){
  document.getElementById("chronik-modal")?.remove();
  const m=document.createElement("div");m.id="chronik-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div id="chronik-card" style="background:#fff;color:#1a1a2e;border-radius:16px;padding:18px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("chronik-modal","📖","Unsere Saison","Spiele, Feste und Meilensteine – die Chronik der jungen Adler","#1e3a8a")}
    <div id="chronik-body" style="text-align:center;padding:24px;color:var(--text3);font-size:var(--s-text)">Lade die Saison …</div>
  </div>`;
  document.body.appendChild(m);
  const heute=isoLokal();
  const d0=new Date(), saisonAb=`${d0.getMonth()>=6?d0.getFullYear():d0.getFullYear()-1}-07-01`;
  let termine=[],ms=[];
  try{
    const [r1,r2]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/termine?select=id,typ,datum,titel,gegner,ergebnis,heim&typ=in.(spiel,turnier,event)&datum=gte.${saisonAb}&datum=lte.${heute}&order=datum.desc`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/rpc/team_meilensteine`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"})
    ]);
    if(r1.ok)termine=(await r1.json())||[];
    if(r2.ok)ms=((await r2.json())||[]).filter(x=>x.erreicht_am>=saisonAb);
  }catch(e){}
  const box=document.getElementById("chronik-body"); if(!box)return;
  const eintraege=[
    ...termine.map(t=>({datum:t.datum,typ:t.typ,t})),
    ...ms.map(x=>({datum:x.erreicht_am,typ:"meilenstein",x}))
  ].sort((a,b)=>a.datum<b.datum?1:-1);
  if(!eintraege.length){box.innerHTML='<div style="padding:10px;color:var(--text3);font-size:var(--s-text)">Die Saison geht gerade erst los – bald steht hier das erste Kapitel! 🦅</div>';return;}
  let html="",monat="";
  const MON=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  eintraege.forEach(e=>{
    const d=new Date(e.datum+"T00:00:00");
    const mLbl=MON[d.getMonth()]+" "+d.getFullYear();
    if(mLbl!==monat){monat=mLbl;html+=`<div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin:16px 4px 8px;text-align:left">${mLbl}</div>`;}
    const ds=d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
    if(e.typ==="meilenstein"){
      html+=`<div style="display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fde047;border-radius:12px;padding:10px 13px;margin-bottom:8px;text-align:left">
        <span style="font-size:var(--s-teil)">🎉</span><span style="flex:1;font-size:var(--s-text);font-weight:800;color:#78350f">${esc(e.x.label)}</span><span style="font-size:var(--s-klein);color:#a16207">${ds}</span></div>`;
    }else{
      const t=e.t, istSpiel=t.typ!=="event";
      const icon=t.typ==="turnier"?"🏆":t.typ==="event"?"🎉":"⚽";
      const erg=(t.ergebnis||"").trim();
      html+=`<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid ${istSpiel?"#1e3a8a":"#f59e0b"};border-radius:12px;padding:10px 13px;margin-bottom:8px;text-align:left">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:var(--s-teil)">${icon}</span>
          <span style="flex:1;min-width:0;font-size:var(--s-text);font-weight:800;color:#0f172a">${esc(t.titel||t.gegner||(istSpiel?"Spiel":"Event"))}${t.heim===true?' <span style="font-size:var(--s-klein);font-weight:800;color:#15803d">HEIM</span>':t.heim===false?' <span style="font-size:var(--s-klein);font-weight:800;color:#b45309">AUSW.</span>':""}</span>
          <span style="font-size:var(--s-klein);color:var(--text3)">${ds}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          ${istSpiel?`<span style="font-size:var(--s-text);font-weight:900;color:${erg?"var(--text)":"var(--text3)"}">${erg?esc(erg):"– Ergebnis folgt –"}</span>`:'<span style="font-size:var(--s-klein);color:#64748b">Team-Event</span>'}
          <button onclick="galerieOpen(${Number(t.id)},'${(t.titel||t.gegner||"").replace(/'/g,"")}')" style="margin-left:auto;border:1px solid #7c3aed;border-radius:9px;background:#faf5ff;color:#6d28d9;font-family:inherit;font-size:var(--s-text);font-weight:700;padding:8px 14px;cursor:pointer;min-height:44px">📸 Fotos</button>
        </div>
      </div>`;
    }
  });
  box.style.textAlign="left"; box.style.padding="0"; box.style.color="inherit";
  box.innerHTML=html;
}
/* L2: „Was ist neu" – kuratierte Highlights je App-Stand, erscheint EINMALIG in den
   Adler News (seen-Baseline). KONVENTION: Bei eltern-sichtbaren neuen Features den key
   (sortierbares Datum) hochsetzen und die Punkte austauschen – sonst entdecken
   Bestandsfamilien neue Funktionen nie (die Tour läuft nur beim ersten Login).
   v717: Neue Eltern-Funktionen kommen jetzt als Zeile in die Tabelle adlerschmiede (Form
   „Kurztitel: Erklärung“); diese Liste ist nur noch der Rückfall ohne Netz bzw. ohne Einträge. */
const ELTERN_WHATSNEW={key:"2026-09-25",titel:"Neu in eurer App",punkte:[
  "🔑 Anmelden mit E-Mail und Passwort – auch auf einem zweiten Gerät. Über 🔑 oben legst du ein Passwort fest oder änderst es. Der Code per E-Mail bleibt für „Passwort vergessen“.",
  "🎟️ Das zweite Elternteil bekommt mit derselben Einladungskarte einen eigenen Zugang.",
  "⏰ Ist die Kabinen-Zeit um, bleibt das Handy gesperrt, bis ihr den Code eingebt.",
  "🦅 Die Kabine ist aufgeräumt: acht Kacheln vorn, alles Weitere unter „Mehr entdecken“."
]};
/* v717: „Aus der Adlerschmiede“ – was in den letzten sieben Tagen für Eltern neu dazugekommen ist
   (sonntags 18 Uhr kommt dazu ein Push). Keine Fehlerbehebungen, keine Trainer-Funktionen. Ist die
   Woche leer, stehen die letzten fünf Einträge da. */
function schmiedeOpen(){
  const alle=Array.isArray(window._adlerschmiede)?window._adlerschmiede:[];
  if(!alle.length){ whatsNewOpen(); return; }
  const grenze=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  let liste=alle.filter(e=>String(e.datum)>=grenze); const woche=liste.length>0;
  if(!woche)liste=alle.slice(0,5);
  const dat=d=>new Date(String(d)+"T12:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
  document.getElementById("wn-modal")?.remove();
  const m=document.createElement("div");m.id="wn-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Aus der Adlerschmiede");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:18px;max-width:460px;width:100%;max-height:86vh;overflow-y:auto">
    ${mdlHead("wn-modal","🛠️","Aus der Adlerschmiede",woche?"Neu in eurer App in den letzten sieben Tagen":"Die letzten Neuerungen in eurer App","#0284c7")}
    ${liste.map(e=>`<div class="schmiede-eintrag" style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--rand-bedien);font-size:var(--s-text);line-height:1.5"><span aria-hidden="true" style="flex:none">${esc(e.emoji||"🛠️")}</span><span><span style="display:block;font-size:var(--s-klein);color:var(--text2)">${esc(dat(e.datum))}</span>${esc(e.text)}</span></div>`).join("")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:10px">Jeden Sonntag um 18 Uhr kommt eine Benachrichtigung, wenn es Neues gibt. Abschalten unter „Trainerteam kontaktieren“ → Benachrichtigungen.</div>
    <button onclick="document.getElementById('wn-modal').remove()" style="width:100%;min-height:48px;margin-top:14px;padding:11px;border:none;border-radius:10px;background:var(--surface2);color:var(--text);font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Super, danke!</button>
  </div>`;
  document.body.appendChild(m);
}
function whatsNewOpen(){
  document.getElementById("wn-modal")?.remove();
  const m=document.createElement("div");m.id="wn-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:#fff;color:#1a1a2e;border-radius:16px;padding:18px;max-width:460px;width:100%">
    ${mdlHead("wn-modal","🆕",esc(ELTERN_WHATSNEW.titel),"Die wichtigsten Neuigkeiten auf einen Blick","#0284c7")}
    ${ELTERN_WHATSNEW.punkte.map(p=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #f1f5f9;font-size:var(--s-text);color:#334155;line-height:1.5">${p}</div>`).join("")}
    <button onclick="document.getElementById('wn-modal').remove()" style="width:100%;margin-top:14px;padding:11px;border:none;border-radius:10px;background:#f1f5f9;color:#334155;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Super, danke!</button>
  </div>`;
  document.body.appendChild(m);
}
/* 🛡️ Datenschutz-Versprechen: DIE Seite für besorgte Eltern (WhatsApp-Bedenken, „Fotos
   meines Kindes im Netz"). Klare Sprache, ehrlich, ohne Jura-Deutsch – als Modal aus
   der Kategorie „Datenschutz & Freigaben". */
function datenschutzInfoOpen(){
  document.getElementById("dsi-modal")?.remove();
  const m=document.createElement("div");m.id="dsi-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const punkt=(emo,t,d)=>`<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid #f1f5f9">
    <span style="font-size:var(--s-teil);line-height:1.2;flex:none">${emo}</span>
    <span><span style="display:block;font-size:var(--s-text);font-weight:800;color:#0f172a">${t}</span>
    <span style="display:block;font-size:var(--s-text);color:#475569;line-height:1.55;margin-top:2px">${d}</span></span></div>`;
  m.innerHTML=`<div style="background:#fff;color:#1a1a2e;border-radius:16px;padding:18px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("dsi-modal","🛡️","So schützen wir eure Fotos &amp; Daten","Kurz &amp; ehrlich erklärt – für alle, die bei WhatsApp ein mulmiges Gefühl haben","#0f766e")}
    ${punkt("🔐","Geschlossener Team-Bereich","Alles hier ist nur mit Login sichtbar – ausschließlich für die Familien und das Trainerteam unserer U9. Öffentlich (Liveticker, Turnierseite, Stadionheft) erscheinen nur gekürzte Namen, und Fotos nur mit der Freigabe „öffentlich“.")}
    ${punkt("📸","Ihr entscheidet über jedes Bild","Für jedes Kind gibt es drei getrennte Freigaben (App-intern / Trainingsvideos / öffentlich) – jederzeit widerrufbar. Ohne euer Häkchen zeigt die App nur Initialen statt Foto. Beim Aushängen und Verteilen werden Nachnamen automatisch gekürzt („Max M.“).")}
    ${punkt("🇪🇺","Daten in Europa","Die Daten liegen auf Servern in Frankfurt (EU) und unterliegen der DSGVO. Keine Werbung, kein Werbe-Tracking, kein Verkauf von Daten – die App gehört dem Team, niemandem sonst. Schrift und Symbole liefert die App selbst mit, ohne Google Fonts oder andere Schriftdienste. Videos und Musik in der Kabine laden erst, wenn ihr oder euer Kind darauf tippt.")}
    ${punkt("🧽","Löschen ist wirklich Löschen","Ein gelöschtes Foto verschwindet sofort aus der App; in den Sicherungskopien liegt es höchstens noch zehn Wochen. Vieles räumt sich selbst auf: Stimmungen, Grüße und ähnliche Einträge verfallen automatisch nach festen Fristen. Einen Auszug eurer Daten könnt ihr jederzeit herunterladen – eine vollständige Auskunft gibt das Trainerteam.")}
    ${punkt("🚑","Sensibles bleibt beim Trainerteam","Notfallkarte und Gesundheits-Hinweise sehen ausschließlich die Trainer – keine anderen Eltern. Ihr pflegt sie selbst und könnt sie jederzeit leeren.")}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-top:14px">
      <div style="font-size:var(--s-text);font-weight:800;color:#166534;margin-bottom:4px">💬 Und warum nicht einfach WhatsApp?</div>
      <div style="font-size:var(--s-text);color:#166534;line-height:1.55">Bei WhatsApp wird jedes Foto sofort als Kopie auf alle Handys der Gruppe verteilt – und landet oft ungefragt in deren Cloud-Backups. Weiterleiten ist ein Fingertipp, Zurückholen unmöglich. Hier bleibt alles im geschützten Bereich, eure Freigaben gelten, und das Trainerteam kann eingreifen. <b>Deshalb: Team-Fotos bitte in die Event-Galerie statt in die Gruppe.</b></div>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:12px;line-height:1.5">Ganz ehrlich: 100 % Sicherheit gibt es nirgends im Internet. Der Unterschied ist Kontrolle – hier behaltet ihr sie, bei Messenger-Gruppen gebt ihr sie ab. Fragen dazu? Sprecht das Trainerteam einfach an.</div>
    <button onclick="document.getElementById('dsi-modal').remove()" style="width:100%;margin-top:14px;padding:11px;border:none;border-radius:10px;background:#f1f5f9;color:#334155;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Alles klar 👍</button>
  </div>`;
  document.body.appendChild(m);
}
/* H1 – Team-Ansagen: aktive Ansagen der letzten 14 Tage als Banner ganz oben. „Gelesen &
   verstanden" schreibt eine Zeile in ansagen_gelesen (user_id = auth.uid per Default);
   der Trainer sieht daraus die Quote „X/Y Familien". Gelesene Banner verschwinden. */
async function elternAnsagenLoad(){
  const el=document.getElementById("ansage-slot"); if(!el)return;
  const ab=new Date(Date.now()-14*864e5).toISOString();
  let rows=[],gelesen=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/ansagen?aktiv=eq.true&created_at=gte.${ab}&select=id,text,created_at&order=created_at.desc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){el.innerHTML="";return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/ansagen_gelesen?select=ansage_id&ansage_id=in.(${rows.map(a=>a.id).join(",")})`,{headers:sbAuthHeaders()});if(r.ok)gelesen=(await r.json()).map(x=>x.ansage_id);}catch(e){}
  const offen=rows.filter(a=>!gelesen.includes(a.id));
  if(!offen.length){el.innerHTML="";return;}
  el.innerHTML=offen.map(a=>{const d=new Date(a.created_at);
    return `<div id="ansage-${a.id}" style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 2px 10px rgba(30,58,138,.25)">
      <div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);font-weight:800;opacity:.9"><span style="font-size:var(--s-karte)">📣</span> Ansage vom Trainerteam · ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</div>
      <div style="font-size:var(--s-karte);font-weight:600;line-height:1.5;margin-top:6px;white-space:pre-wrap">${esc(a.text)}</div>
      <button onclick="elternAnsageAck(${a.id},this)" style="width:100%;min-height:44px;margin-top:10px;border:none;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:var(--s-text);font-weight:800;cursor:pointer">✓ Gelesen &amp; verstanden</button>
    </div>`;}).join("");
}
/* I-A – Genesungsgrüße: pausierte Teamkinder mit Trainer-Freigabe (kind_pause.gruesse_ok,
   RLS zeigt Eltern NUR freigegebene Pausen, nie den Grund). 1 Tap schickt einen vordefinierten
   Gruß im Namen des eigenen Kindes (kabine_post typ=genesung, max 1/Tag per DB-Unique). */
async function elternGenesungLoad(kids){
  const el=document.getElementById("genesung-slot"); if(!el||!kids||!kids.length)return;
  const heute=isoLokal();
  const eigene=kids.map(k=>k.spieler_id);
  let pausen=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_pause?select=spieler_id&bis=gte.${heute}`,{headers:sbAuthHeaders()});if(r.ok)pausen=((await r.json())||[]).map(x=>x.spieler_id).filter(id=>!eigene.includes(id));}catch(e){}
  if(!pausen.length){el.innerHTML="";return;}
  let namen={};
  // RPC statt Direkt-Select: die Eltern-RLS auf kader zeigt nur die eigenen Kinder (Bugfix)
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kader_namen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)((await r.json())||[]).forEach(k=>namen[k.id]=k.name);}catch(e){}
  // heute schon gegrüßt? (vom ersten eigenen Kind aus)
  let schon=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_post?von_spieler=eq.${eigene[0]}&datum=eq.${heute}&an_spieler=in.(${pausen.join(",")})&select=an_spieler`,{headers:sbAuthHeaders()});if(r.ok)schon=((await r.json())||[]).map(x=>x.an_spieler);}catch(e){}
  const offen=pausen.filter(id=>!schon.includes(id)&&namen[id]);
  if(!offen.length){el.innerHTML="";return;}
  const G=(typeof GENESUNG_TEXTE!=="undefined")?GENESUNG_TEXTE:["💌 Gute Besserung!","🦅 Wir vermissen dich!","💪 Komm bald wieder!","⚽ Der Platz wartet auf dich!"];
  el.innerHTML=offen.map(id=>`<div id="gen-${id}" style="background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;border-left:4px solid #f43f5e;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:800;font-size:var(--s-text);color:#0f172a">💌 ${esc(namen[id])} fällt gerade aus</div>
    <div style="font-size:var(--s-klein);color:#64748b;margin-top:1px">Schick einen Gruß vom Team – im Namen deines Kindes. ${esc(namen[id])} sieht ihn in der Kabine.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${G.map((t,i)=>`<button onclick="elternGenesungSend(${eigene[0]},${id},${i},this)" style="flex:1 1 45%;min-height:44px;padding:8px;border:1.5px solid #fda4af;border-radius:10px;background:#fff1f2;color:#9f1239;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${esc(t)}</button>`).join("")}
    </div>
  </div>`).join("");
}
async function elternGenesungSend(vonSid,anSid,key,btn){
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({typ:"genesung",von_spieler:vonSid,an_spieler:anSid,text_key:key,datum:isoLokal()})});
    if(r.status===409){document.getElementById("gen-"+anSid)?.remove();toast("Heute schon gegrüßt 🙂");return;}
    if(!r.ok&&r.status!==201){toast("Konnte nicht senden","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  document.getElementById("gen-"+anSid)?.remove();
  toast("💌 Gruß ist unterwegs!");
}
async function elternAnsageAck(id,btn){
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ansagen_gelesen`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({ansage_id:id})});
    // 409 = schon bestätigt (Doppel-Tap) – dann ebenfalls einfach ausblenden
    if(!r.ok&&r.status!==201&&r.status!==409){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  document.getElementById("ansage-"+id)?.remove();
  toast("Danke! ✓");
}
async function elternDashLoad(){
  try{if(typeof elTickerTimer!=="undefined"&&elTickerTimer){clearInterval(elTickerTimer);elTickerTimer=null;}}catch(e){} // Ticker-Poll endet beim Verlassen der Match-Ansicht
  const body=document.getElementById("ep-dash-body");
  if(!body)return;
  const card=(inner)=>`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">${inner}</div>`;
  const heute=isoLokal();
  // UX 3: kam der Elternteil über einen Deep-Link (?rsvp=…)? Dann Nudge erzwingen + hinscrollen.
  let rsvpIntent=null; try{rsvpIntent=sessionStorage.getItem("adler_rsvp_intent");}catch(e){}
  let kids=[], termin=null;
  /* ⚠️ Der Filter auf die eigene E-Mail ist KEINE Bequemlichkeit, sondern der Kern.
     Die RLS auf `eltern_kinder` erlaubt „eigene E-Mail ODER is_trainer()" – ein Trainer
     bekommt hier also ALLE Zuordnungen. Ohne Filter war kids[0] die erste Zeile der
     Tabelle, und der Eltern-Zugang eines Trainers zeigte damit ein fremdes Kind:
     dessen Notfallkarte, dessen Foto-Freigaben, dessen Rückmeldungen – bedienbar.
     Fast alle Trainer sind selbst Eltern, der Fall ist also der Normalfall.
     (Dieselbe Falle wie v401: Abfrage ohne Filter, die sich auf eine absichtlich weite
     RLS verlaesst. Wer „meins" meint, muss „meins" hinschreiben.) */
  const meineMail=(typeof sbEmail==="function")?sbEmail():null;
  if(meineMail){
    try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?email=eq.${encodeURIComponent(meineMail)}&select=spieler_id,label,kader(id,name,nr,foto_stadionheft_ok,geb)&order=spieler_id.asc`,{headers:sbAuthHeaders()});if(r.ok)kids=await r.json();}catch(e){}
  }
  if(!kids.length){ body.innerHTML=card('<div style="color:#475569;font-size:var(--s-text);line-height:1.6">Dein Trainer hat diese E-Mail noch <b>keinem Kind</b> zugeordnet.<br>Bitte gib ihm die E-Mail-Adresse, mit der du dich hier angemeldet hast.</div>'); return; }
  window._elternKids=kids;   // fürs Fairplay-Quiz (Federn fürs eigene Kind)
  let termineListe=[]; // UX 6: Timeline – die nächsten Termine, nicht nur der eine
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=15`,{headers:sbAuthHeaders()});if(r.ok){termineListe=(await r.json()).filter(t=>!(typeof terminVorbei==="function"&&terminVorbei(t)));termin=termineListe[0]||null;}}catch(e){}
  ELTERN_TERMINE=termineListe; // für den „Alle Termine"-Dialog + Kalender-Export
  // K1: unabhängige Daten PARALLEL laden statt nacheinander (Dashboard-Tempo auf dem Handy):
  // Rückmeldung zum nächsten Termin, Rückmeldungen fürs Karussell und die Kassen-Zusammenfassung.
  let rsvp={}, rsvpAll={}, kasse=null;
  {
    const kidIds=kids.map(k=>k.spieler_id).join(","), tids=termineListe.map(t=>t.id).join(",");
    const j=r=>(r&&r.ok)?r.json():null;
    const [r1,r2,r3]=await Promise.all([
      termin?fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${termin.id}&spieler_id=in.(${kidIds})&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()}).then(j).catch(()=>null):Promise.resolve(null),
      (tids&&kidIds)?fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=in.(${tids})&spieler_id=in.(${kidIds})&select=termin_id,spieler_id,status`,{headers:sbAuthHeaders()}).then(j).catch(()=>null):Promise.resolve(null),
      fetch(`${SB_URL}/rest/v1/rpc/kasse_summary`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"}).then(j).catch(()=>null)
    ]);
    (r1||[]).forEach(x=>rsvp[x.spieler_id]=x);
    (r2||[]).forEach(x=>{(rsvpAll[x.termin_id]=rsvpAll[x.termin_id]||{})[x.spieler_id]=x.status;});
    kasse=r3;
  }
  /* PO v407: „oben sollte immer der nächste Termin stehen und offenen Rückmeldung für
     Termine der nächsten 14 Tage."
     Die Terminkarte wird deshalb ZUERST gebaut und danach eingehängt – der Platz-Status
     steckt jetzt IN ihr (nur wenn er vom Normalfall abweicht), nicht als eigene Kachel
     davor. Alles Weitere (Ansagen, Pause-Karte, To-Dos, News, Rückblick) rutscht darunter. */
  let html="", terminHtml="";
  /* v467: Die Live-Kachel steht NOCH ueber der Terminkarte – waehrend das Spiel laeuft,
     ist sie das Dringlichste auf der Seite. Sie fuellt sich nur, wenn wirklich getickert
     wird (elternLiveKachelLoad), sonst bleibt der Slot leer und kostet keine Zeile. */
  html+='<div id="eltern-live-slot"></div>';
  html+='<div id="push-hinweis-slot"></div>';   // v698: ganz oben – Benachrichtigungen, solange sie aus sind
  html+='<div id="rufe-hinweis"></div>';          // v673: neue Adler-Rufe – nur wenn es welche gibt
  html+='<div id="eltern-top-slot"></div>';        // hier landet die Terminkarte (s. u.)
  html+='<div id="eltern-offen-slot"></div>';      // offene Rückmeldungen der nächsten 14 Tage
  if(termin&&(termin.typ==="spiel"||termin.typ==="turnier"))html+='<div id="pause-card"></div>';
  html+='<div id="ansage-slot"></div>'; // H1: ungelesene Trainer-Ansagen als Banner
  html+='<div id="genesung-slot"></div>'; // I-A: „X fehlt gerade" – 1-Tap-Genesungsgruß (nur mit Trainer-Freigabe)
  // ── 📌 ZU ERLEDIGEN: alle offenen Punkte gebündelt, ganz oben. Die Loader füllen die Slots;
  //    ist alles leer, blendet elternTodoSync() die ganze Sektion aus. ──
  // 📌 To-Do's als Kategorie-Button (optisch wie die Kategorien unten); Inhalt öffnet sich im
  //    Overlay-Panel #cat-todo. Sichtbar nur, wenn offene Punkte da sind (elternTodoSync nach den Loadern).
  html+=`<button id="eltern-todo-btn" onclick="elternCatOpen('todo')" style="display:none;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:10px;border:none;border-radius:14px;background:linear-gradient(135deg,#b45309,#92400e);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(217,119,6,.25)">
    <span style="font-size:var(--s-seite);line-height:1">📌</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">Zu erledigen</span><span style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">Rückmeldungen, Mitbringen, Grillhütte, „Wie war's"</span></span>
    <span id="eltern-todo-badge" style="background:#fff;color:#b45309;font-weight:800;font-size:var(--s-text);border-radius:12px;padding:2px 9px"></span>
    <span style="font-size:var(--s-teil);opacity:.85">›</span>
  </button>`;
  // 📣 Adler News: eigener Button (News ≠ To-Do); Panel #cat-news; roter Badge bei Ungelesenem.
  /* PO v407: „adlernews auch nur wenn etwas drin ist." – wie beim To-Do-Knopf: unsichtbar
     starten, elternNewsLoad blendet ihn nur bei ungelesenen Punkten ein. */
  html+=`<button id="eltern-news-btn" onclick="elternCatOpen('news')" style="display:none;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:10px;border:none;border-radius:14px;background:linear-gradient(135deg,#0369a1,#075985);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(2,132,199,.22)">
    <span style="font-size:var(--s-seite);line-height:1">📣</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">Adler News</span><span style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">Neues aus dem Team &amp; von deinem Kind</span></span>
    <span id="eltern-news-badge" style="display:none;background:#ef4444;color:#fff;font-weight:800;font-size:var(--s-text);border-radius:12px;padding:2px 9px">0</span>
    <span style="font-size:var(--s-teil);opacity:.85">›</span>
  </button>`;
  // A1: persönlicher Nach-dem-Spiel-Gruß – der Slot steht jetzt UNTER den Terminen (s. u.).
  if(!termin){
    terminHtml=card('<div style="font-weight:700;margin-bottom:2px">📅 Nächster Termin</div><div style="color:#64748b;font-size:var(--s-text)">Aktuell ist kein Termin geplant.</div>');
  }else{
    const m=(typeof TM_META!=="undefined"&&TM_META[termin.typ])||{icon:"📅",label:termin.typ,col:"#1e3a8a"};
    const d=new Date(termin.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=termin.uhrzeit?String(termin.uhrzeit).slice(0,5)+" Uhr":"";
    const offen=kids.filter(k=>!rsvp[k.spieler_id]);
    const trainerJa=Object.keys(termin.trainer_status||{}).filter(n=>(termin.trainer_status||{})[n]==="ja");
    // Zu-/Absage direkt am Termin – erneuter Klick auf den aktiven Status entfernt ihn wieder.
    const rsvpRows=kids.map(k=>{
      const kd=k.kader||{}, cur=rsvp[k.spieler_id], st=cur?cur.status:null;
      const btns=Object.keys(EP_RSVP).map(s=>{
        const on=st===s, c=EP_RSVP[s];
        const act=on?`elternRsvpClear(${termin.id},${k.spieler_id})`:`elternRsvp(${termin.id},${k.spieler_id},'${s}')`;
        return `<button onclick="${act}" style="flex:1;min-width:0;min-height:44px;padding:6px 3px;border-radius:10px;border:1.5px solid ${on?c.col:"var(--rand-bedien)"};background:${on?c.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:var(--s-klein);font-weight:700;line-height:1.15;cursor:pointer">${c.emo} ${c.lbl}</button>`;
      }).join("");
      return `<div style="border-top:1px solid #f1f5f9;margin-top:10px;padding-top:10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-weight:700;font-size:var(--s-karte)">${esc(kd.name||"Kind")}</span>
          ${kd.nr!=null?`<span style="color:var(--text3);font-weight:600;font-size:var(--s-text)">#${kd.nr}</span>`:""}
          <span style="margin-left:auto;font-size:var(--s-klein);font-weight:700;color:${st?EP_RSVP[st].col:"#b45309"}">${st?EP_RSVP[st].emo+" "+EP_RSVP[st].lbl:"❗ offen"}</span>
        </div>
        <div style="display:flex;gap:6px">${btns}</div>
        ${cur&&cur.kommentar?`<div style="font-size:var(--s-klein);color:#64748b;margin-top:3px">„${esc(cur.kommentar)}"</div>`:""}
        ${(st==="zugesagt"&&(termin.typ==="spiel"||termin.typ==="turnier")&&termin.heim===false)?`<button onclick="elternCarpoolOpen(${k.spieler_id},${termin.id})" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">🚗 Fahrgemeinschaft</button>`:""}
      </div>`;
    }).join("");
    // J5: Rückmelde-Frist – ab dem Vortag wird eine offene Rückmeldung rot & dringlich
    const morgen=new Date(Date.now()+864e5).toISOString().slice(0,10);
    const dringend=offen.length>0&&termin.datum<=morgen;
    /* Der Platz-Status färbt die Karte, wenn er vom Normalfall abweicht – sonst zeigt die
       Umrandung wie bisher die fehlende Rückmeldung an (PO v407: „Entweder über einen
       Hinweis oder eine farbige Umrandung"). */
    const statusRand=(typeof elternPlatzRandFarbe==="function")?elternPlatzRandFarbe(termin):"";
    const rand=statusRand?`border:2px solid ${statusRand};box-shadow:0 4px 16px ${statusRand}33`
      :(offen.length?(dringend?"border:2px solid #ef4444;box-shadow:0 4px 16px rgba(239,68,68,.22)":"border:2px solid #f59e0b;box-shadow:0 4px 16px rgba(245,158,11,.18)"):"");
    terminHtml=`<div id="termin-card" style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;${rand}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:var(--s-text);font-weight:800;color:var(--text2)">Nächster Termin</div>
        ${offen.length?(dringend?`<span style="margin-left:auto;font-size:var(--s-klein);font-weight:800;color:#b91c1c;background:#fef2f2;border:1px solid #fca5a5;border-radius:20px;padding:2px 8px">⏰ Rückmeldung überfällig – bitte jetzt</span>`:`<span style="margin-left:auto;font-size:var(--s-klein);font-weight:800;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:20px;padding:2px 8px">❗ Rückmeldung fehlt</span>`):""}
      </div>
      ${(typeof elternPlatzHinweisHtml==="function")?elternPlatzHinweisHtml(termin):""}
      <div style="font-size:var(--s-karte);font-weight:800;margin-top:2px">${m.icon} ${esc(termin.titel||termin.gegner||m.label)}${heimLabel(termin)?` <span style="font-size:var(--s-klein);font-weight:800;padding:2px 7px;border-radius:10px;background:${termin.heim?"#dcfce7":"#fef3c7"};color:${termin.heim?"#15803d":"#b45309"};white-space:nowrap">${heimLabel(termin)}</span>`:""}</div>
      <div style="font-size:var(--s-text);color:#64748b;margin-top:3px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}${zeit?" · "+zeit:""}${termin.ort?" · "+mapsAnchor(termin.ort):""}${termin.platz?" · 🏟️ "+esc(termin.platz):""}</div>
      <div id="wetter-eltern"></div>
      ${trainerJa.length?`<div style="font-size:var(--s-klein);color:#64748b;margin-top:4px">👤 Trainer dabei: ${trainerJa.map(esc).join(", ")}</div>`:""}
      ${kids.length>=2?`<button onclick="elternRsvpAllYes(${termin.id})" style="width:100%;min-height:44px;margin-top:10px;padding:9px;border:1.5px solid #059669;border-radius:10px;background:#f0fdf4;color:#15803d;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">👍 Alle ${kids.length} Kinder zusagen</button>`:""}
      ${rsvpRows}
      <!-- PO: „Beim Training ist der Satz mit der endgültigen Aufstellung egal. nur bei spiel
           jemand turnier" – beim Training wird niemand aufgestellt, da wäre der Zusatz nur
           eine Einschränkung ohne Anlass. Der erste Satz gilt überall. -->
      <div style="font-size:var(--s-klein);color:var(--text3);margin-top:8px">Aktiven Status nochmal tippen = Rückmeldung entfernen.${(termin.typ==="spiel"||termin.typ==="turnier")?" Deine Rückmeldung ist ein Hinweis – die endgültige Aufstellung entscheidet der Trainer.":""}</div>
      ${termin.typ==="training"?'<div id="betreuung-card"></div>':""}
      <div id="helfer-card"></div><!-- PO: Hilfe wird kurzfristig entschieden, nicht im Voraus -->

      ${termin.typ==="turnier"?'<div id="turnierplan-card"></div>':""}
      ${(termin.datum===heute&&(termin.typ==="spiel"||termin.typ==="turnier"))?elternTickerHtml(termin):""}
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="galerieOpen(${termin.id},'${(termin.titel||termin.gegner||m.label).replace(/'/g,'')}')" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📸 ${fotoLabel(termin.typ)}</button>
        <!-- „Alle Termine" entfernt: die Kachel „Alle Termine & Kalender-Abo" darunter kann dasselbe + mehr (PO) -->
      </div>
    </div>`;
  }
  const sec=(t)=>`<div style="font-size:var(--s-karte);font-weight:900;color:var(--text);margin:20px 4px 8px">${t}</div>`;   // v686: wie die Überschriften der Trainer-App, keine grauen Versalien
  // Terminkarte und die offenen Rückmeldungen wandern in ihre Slots ganz oben.
  /* Ersatz per FUNKTION, nicht per String: in $-Zeichen der Termindaten („$" im Titel,
     „$&") sieht String.replace sonst Rückverweise und frisst Teile der Karte. */
  const offenHtml=elternOffeneRsvpHtml(termineListe,kids,rsvpAll,termin&&termin.id);
  html=html.replace('<div id="eltern-top-slot"></div>',()=>terminHtml)
           .replace('<div id="eltern-offen-slot"></div>',()=>offenHtml);
  // ── TERMINE ── (Karussell + Kalender-Abo)
  html+=sec("📅 Termine");
  html+=elternTermineCarouselHtml(termineListe,kids,rsvpAll,termin&&termin.id); // v686: Liste ohne den Termin von oben, geantwortet wird oben
  html+=card(`<button onclick="elternTermineOpen()" style="width:100%;min-height:46px;padding:12px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📅 Alle Termine &amp; Kalender-Abo</button>`);
  /* PO: „Rückblick unter Termine setzen." Der Nach-dem-Spiel-Gruß stand über den Terminen
     und drängte sich damit vor das, was zu tun ist. Er bleibt aber eine SICHTBARE Karte und
     wandert bewusst nicht in eine Kategorie: er ist das einzige auf dieser Seite, das nichts
     von einem will – hinter einem Tap versteckt würde er nie gelesen. Jetzt: erst der Termin,
     dann die Antworten, dann die Termine – und danach der schöne Blick zurück. */
  html+=`<div id="match-gruss-slot"></div>`;
  /* Paket 1: „Das kann dein Kind jetzt" – direkt UNTER dem Rückblick. Erst wie es
     ausging, dann was dazugekommen ist. Die Karte baut sich nur, wenn es etwas gibt. */
  html+=`<div id="kann-jetzt-slot"></div>`;
  // ── FÜR DIE KINDER ── (gleiche Button-Optik wie die Kategorien unten: Kabine = Direktstart,
  //    je Kind ein Button, der ein Kind-Fenster im Overlay öffnet)
  html+=sec("🎮 Für die Kinder");
  html+=`<button onclick="kabineOpen()" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(168,85,247,.25)">
    <span style="font-size:var(--s-seite);line-height:1">🎮</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">Die Kabine</span><span style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">Kinder-Modus: Galerie, Missionen &amp; Quiz (${XP_ICON} Federn)</span></span>
    <span style="font-size:var(--s-teil);opacity:.85">›</span>
  </button>`;
  html+=`<button onclick="kinderAppOpen()" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(124,58,237,.25)">
    <span style="font-size:var(--s-seite);line-height:1">\u{1F4F1}</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">Kinder-App</span><span style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">Eigenes Ger\u00e4t koppeln und die Appzeit einstellen</span></span>
    <span style="font-size:var(--s-teil);opacity:.85">\u203a</span>
  </button>`;
  html+=kids.map(k=>{const kd=k.kader||{};
    return `<button onclick="elternCatOpen('kind-${k.spieler_id}')" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(109,40,217,.22)">
      <span style="font-size:var(--s-seite);line-height:1">🃏</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">${esc(kd.name||"Kind")}${kd.nr!=null?` <span style="font-weight:600;opacity:.8">#${kd.nr}</span>`:""}</span><span id="xp-chip-${k.spieler_id}" style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">Karte, Abzeichen, Sprachlob &amp; Statistik</span></span>
      <span style="font-size:var(--s-teil);opacity:.85">›</span>
    </button>`;
  }).join("");
  html+=`<div id="eltern-level-slot" style="margin:4px 0 12px"></div>`;  // C1: kollektives Team-Level
  // ── MEHR VOM TEAM (einklappbar – Referenz/Selteneres) · kasse kam schon parallel oben ──
  // ── Kategorie-Buttons: öffnen je ein fokussiertes Fenster (statt Inline-Akkordeon). Die
  //    Inhalte liegen (versteckt) im Overlay, damit die Async-Loader ihre Slots weiter füllen. ──
  // Einheitliche Aktions-Zeile für die Panel-Inhalte (Icon + Titel + Beschreibung + ›, farbiger
  // Akzent links in Tönen der Kategorie-Farbe). noClose=true lässt das Fenster offen (z. B. Export).
  const elRow=(emo,label,d,onclick,col,noClose)=>`<button onclick="${noClose?"":"elternCatClose();"}${onclick}" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:1px solid var(--rand-bedien);border-left:4px solid ${col};border-radius:12px;padding:13px;margin-bottom:8px;font-family:inherit;cursor:pointer"><span style="font-size:var(--s-teil);line-height:1">${emo}</span><span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-text);font-weight:700;color:#0f172a">${label}</span><span style="display:block;font-size:var(--s-klein);color:#64748b;margin-top:1px">${d}</span></span><span style="font-size:var(--s-karte);color:var(--text3)">›</span></button>`;
  const catBtn=(id,emoji,title,desc,grad)=>`<button onclick="elternCatOpen('${id}')" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:${grad};color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.08)"><span style="font-size:var(--s-seite);line-height:1">${emoji}</span><span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">${title}</span><span style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">${desc}</span></span><span style="font-size:var(--s-teil);opacity:.85">›</span></button>`;
  html+=sec("Mehr");
  // v637: Der Weg zum Trainerteam steht zuerst und heißt so, wie Eltern danach suchen.
  html+=catBtn('kontakt','🗣️','Trainerteam kontaktieren','Frage oder Elterngespräch, Benachrichtigungen','linear-gradient(135deg,#475569,#334155)');
  /* v699: Mannschaftskasse als eigene Kachel – alle Eltern lesen Kassenstand und jede Bewegung;
     darunter „Kasse führen“, nur für die Kasse (elternKasseRolleLoad füllt den Slot). */
  const mkSaldo=kasse&&kasse.saldo!=null?`Kassenstand ${Number(kasse.saldo).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} € · Ausgaben und Beiträge`:"Kassenstand, Ausgaben und Beiträge";
  html+=`<button type="button" id="mannschaftskasse-kachel" onclick="if(typeof mannschaftskasseOpen==='function')mannschaftskasseOpen()" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.08)">
    <span aria-hidden="true" style="font-size:var(--s-seite);line-height:1">💰</span><span style="flex:1;min-width:0"><span style="display:block;font-weight:800;font-size:var(--s-karte)">Mannschaftskasse</span><span style="display:block;font-size:var(--s-klein);opacity:.92;margin-top:1px">${mkSaldo}</span><span id="mk-beitrag-stand" style="display:block;font-size:var(--s-klein);font-weight:700;margin-top:3px"></span></span><span aria-hidden="true" style="font-size:var(--s-teil);opacity:.85">›</span></button>`;   // v710: Maße wie catBtn – stand sichtbar aus der Flucht
  html+=`<div id="kasse-verwalten-slot"></div>`;   // v664/v699: „Kasse führen“ – nur für die Kasse
  html+=catBtn('mehr','📰','Mehr vom Team','Adler Nest, Börse, Fundbüro','linear-gradient(135deg,#1e3a8a,#2563eb)');
  html+=catBtn('regeln','📋','Regeln &amp; Vereinbarungen','Unsere Vereinbarung &amp; das Fairplay-Quiz','linear-gradient(135deg,#15803d,#047857)');
  html+=catBtn('datenschutz','🔒','Datenschutz &amp; Freigaben','Foto/Video, Notfallkarte, Datenexport','linear-gradient(135deg,#0f766e,#115e59)');
  // Versionszeile: hilft, wenn jemand „bei mir sieht das anders aus" meldet (v409)
  html+=`<div id="app-version-eltern" style="text-align:center;font-size:var(--s-klein);color:var(--text3);margin:16px 0 4px"></div>`;
  html+=`<div id="el-cat-overlay" style="display:none;position:fixed;inset:0;z-index:10000;background:var(--bg,#f1f5f9);overflow-y:auto"><div style="max-width:560px;margin:0 auto;padding:12px 16px 40px">
    <div style="display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg,#f1f5f9);padding:8px 0 10px;z-index:1">
      <button onclick="elternCatClose()" aria-label="Zurück" style="border:none;background:#fff;width:40px;height:40px;border-radius:50%;font-size:var(--s-teil);color:#334155;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);flex:none">←</button>
      <div id="el-cat-title" style="font-size:var(--s-teil);font-weight:800"></div>
    </div>
    <div id="cat-todo" class="el-cat-panel" style="display:none">
      <div id="eltern-checklist-slot"></div>
      <div id="helfer-todo-slot"></div>
      <div id="eltern-poll-slot"></div>
      <div id="mitbring-slot"></div>
      <div id="buedchen-slot"></div>
      <div id="puls-nudge-slot"></div>
    </div>
    <div id="cat-news" class="el-cat-panel" style="display:none"></div>
    ${kids.map(k=>{const kd=k.kader||{};const nn=(kd.name||"").replace(/'/g,"");
      return `<div id="cat-kind-${k.spieler_id}" class="el-cat-panel" data-cat-title="🃏 ${esc(kd.name||"Kind")}" style="display:none">
        ${elRow("🃏","Adler-Karte ansehen","Die Karte deines Kindes – Stärken, Spiele, Trainings, ohne Bewertungszahlen",`elternCardOpen(${k.spieler_id})`,"#5b21b6")}
        ${elRow("🎖️","Technik-Abzeichen","Übungen zu Hause abhaken – Federn sammeln",`abzeichenOpen(${k.spieler_id},'${nn}')`,"#6d28d9")}
        ${elRow("🎧","Sprachlob anhören","Persönliches Lob vom Trainerteam",`lobPlay(${k.spieler_id})`,"#7c3aed")}
        ${elRow("✏️","Fan-Fakten &amp; Foto","Lieblingsverein, Spitzname &amp; Kartenfoto pflegen",`elternFanfactsOpen(${k.spieler_id},'${nn}')`,"#8b5cf6")}
        ${elRow("📊","Saison-Statistik","Spiele, Einsätze &amp; Highlights – ansehen, auf Wunsch teilen",`childWrappedOpen(${k.spieler_id})`,"#a855f7")}
      </div>`;}).join("")}
    <div id="cat-mehr" class="el-cat-panel" style="display:none">`;
  html+=elRow("👤","Meine Angaben","Name, Handy, Geburtstag – und der Geburtstag deines Kindes","elternAngabenOpen()","#1e3a8a");   // v660
  html+=`<div id="team-ansprech-slot"></div>`;   // v663: Elternbeirat, Kasse, Beitrag
  html+=elRow("📰","Adler Nest (Stadionheft)","Neuigkeiten, Ergebnisse und Geburtstage",`location.href='${location.pathname}?heft&von=app'`,"#1e3a8a");
  html+=elRow("📖","Unsere Saison (Chronik)","Alle Spiele, Feste &amp; Meilensteine als Zeitstrahl – wächst jede Woche","chronikOpen()","#1d4ed8",true);
  html+=elRow("🛍️","Adler-Börse","Zu kleine Schuhe &amp; Trikots an Adler-Kinder weitergeben","boerseOpen()","#2563eb");
  html+=elRow("🧦","Fundbüro","Verlorenes &amp; Gefundenes – hier sammelt das Team","fundbueroOpen()","#3b82f6");
  html+=`<div id="skill-slot"></div>`;        // Skill der Woche
  if(WAESCHE_AKTIV)html+=`<div id="waesche-slot"></div>`;  // Trikot-Wäsche-Rotator (aktuell ausgeblendet)
  // v699: Teamkasse-Karte und „Kasse verwalten“ sind in die Kacheln „Mannschaftskasse“ / „Kasse führen“ umgezogen
  html+=`<div id="ak-slot"></div>`; // FEAT Z: Adler-Kasse (async, nur wenn Link gesetzt)
  html+=`</div>`; // /cat-mehr
  html+=`<div id="cat-regeln" class="el-cat-panel" style="display:none">`;
  html+=elRow("🤝","Unsere Vereinbarung","Fairplay-Codex zum Bestätigen + alles Praktische in 5 Rubriken","vereinbarungOpen()","#15803d");
  const fpqDone=(function(){try{return localStorage.getItem("adler_fpq_done")==="1";}catch(e){return false;}})();
  // PO: einmal gespielt = erledigt. Die Federn vergibt der Server ohnehin nur einmal
  // (xp_award_event ist idempotent) – die Kachel sagt das jetzt auch ehrlich.
  html+=fpqDone
    ? `<div style="display:flex;align-items:center;gap:12px;width:100%;padding:14px;margin-bottom:8px;border-radius:14px;background:#f1f5f9;color:var(--text3)">
        <span style="font-size:var(--s-seite);line-height:1;opacity:.6">🏅</span>
        <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800">Fairplay-Quiz</span><span style="display:block;font-size:var(--s-klein);margin-top:1px">✓ Schon gespielt – die ${XP_LABEL} sind beim Kind angekommen</span></span>
      </div>`
    : elRow("🏅","Fairplay-Quiz spielen",`${XP_ICON} 50 ${XP_LABEL} fürs Kind – kurze Fragen zum Codex`,"fairplayQuizStart(window._elternKids)","#15803d");
  html+=`</div>`; // /cat-regeln
  // ── DATENSCHUTZ & FREIGABEN (NEU): Foto/Video + Notfallkarte pro Kind + Datenexport ──
  html+=`<div id="cat-datenschutz" class="el-cat-panel" style="display:none">`;
  html+=elRow("🛡️","So schützen wir eure Fotos &amp; Daten","Warum die App sicherer ist als die WhatsApp-Gruppe – kurz erklärt","datenschutzInfoOpen()","#115e59",true);
  html+=kids.map(k=>{const kn=esc((k.kader&&k.kader.name)||"Kind");const nn=((k.kader&&k.kader.name)||"").replace(/'/g,"");
    return elRow("📸",`Foto- &amp; Video-Freigabe: ${kn}`,"App-intern / Trainingsvideos / öffentlich – jederzeit widerrufbar",`elternFotoConsentOpen(${k.spieler_id},'${nn}')`,"#0f766e")
         + elRow("🚑",`Notfallkarte: ${kn}`,"Allergien, Medikamente &amp; Notfallkontakt – nur fürs Trainerteam",`notfallOpen(${k.spieler_id},'${nn}')`,"#0d9488");
  }).join("");
  html+=elRow("💾","Meine Daten herunterladen","Alles zu deinem Konto und deinen Kindern als Datei (JSON) – ohne Einschätzungen des Trainerteams","elternDataExport(this)","#14b8a6",true);
  html+=elRow("🗑️","Daten löschen","Eigenes Konto sofort löschen · Löschung der Daten deines Kindes beantragen","elternLoeschenOpen()","#b91c1c",true);   // v644
  html+=`</div>`; // /cat-datenschutz
  html+=`<div id="cat-kontakt" class="el-cat-panel" style="display:none">`;
  html+=`<div id="eg-slot"></div>`; // Status einer laufenden Elterngespräch-Anfrage
  html+=elRow("🗣️","Elterngespräch anfragen","Kurz Bescheid sagen – der Trainer meldet sich zur Terminabstimmung","elternGespraechOpen()","#334155");
  html+=`<div id="eltern-poll-info-slot"></div>`; // Elterngespräch-Terminfindung: beantwortet/entschieden (offene Abstimmungen leben im To-Do-Fenster)
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🔔 Benachrichtigungen</div>
    <div style="font-size:var(--s-text);color:#64748b;margin-bottom:8px">Erinnerungen an Termine, offene Rückmeldungen und Neuigkeiten direkt aufs Handy.</div>
    <div id="push-slot-eltern"></div>`);
  html+=`</div>`; // /cat-kontakt
  html+=`</div></div>`; // /el-cat-overlay
  const scrollVor=_epScrollMerken(body);   // Wischposition der Karussells retten
  const ankerVor=_epAnkerMerken(body);     // v666: senkrechte Lage des Karussells
  body.innerHTML=html;
  _epScrollZurueck(scrollVor,body);        // …und sofort wiederherstellen, vor dem ersten Bild
  _epAnkerHalten(ankerVor,body);
  try{ const tb=document.getElementById("cat-todo"); if(tb){ new MutationObserver(elternTodoSync).observe(tb,{childList:true,subtree:true}); elternTodoSync(); } }catch(e){}
  elternThemeInit();          // Observer für Modals/Slots (einmalig)
  elternThemeSweep(body);     // Dashboard bei Dark-Theme einfärben
  if(termin&&termin.datum)wetterInto("wetter-eltern",termin.datum,termin.ort,termin.uhrzeit); // Wetter am Termin-Ort + Uhrzeit
  if(termin&&termin.typ==="training")elternBetreuungLoad(termin.id,kids); // wer bleibt vor Ort
  if(termin)elternHelferKachelLoad(termin);                               // Helfer-Aufgaben kompakt
  if(termin&&termin.typ==="turnier")elternTurnierplanLoad(termin);        // Begegnungen, Turnierbaum, Aushang
  if(termin&&(termin.typ==="spiel"||termin.typ==="turnier"))elternPauseLoad(termin,kids);
  if(!window._eTourChecked){window._eTourChecked=true;setTimeout(elternTourMaybe,700);} // Eltern-Tour einmalig
  kabineCodeHash().catch(()=>{});   // Hash vorladen, damit die Kabine auch offline wieder aufgeht
  adlerkasseLinkGet().then(l=>{const el=document.getElementById("ak-slot");if(!el)return;el.innerHTML=adlerkasseCardHtml(l)+(l?akShareBtnHtml():"");if(l)window._akLink=l;}).catch(()=>{});
  elternAnsagenLoad();                         // H1: Trainer-Ansagen mit Gelesen-Status
  elternTeamAnsprechLoad();                    // v663: Elternbeirat, Kasse, Beitrag
  if(typeof elternKasseRolleLoad==="function")elternKasseRolleLoad();      // v664: Kasse verwalten
  if(typeof rufeBadgeLoad==="function")rufeBadgeLoad();                    // v670: neue Adler-Rufe
  window._elternKids=kids;   // v699: die Mannschaftskasse zeigt den Stand der eigenen Kinder beim Öffnen
  elternKasseKachelStand(kids, kasse);   // v716: „Beitrag bezahlt / offen“ direkt auf der Kachel
  elternGenesungLoad(kids);                    // I-A: Genesungsgrüße für pausierte Teamkinder
  elternHelferTodoLoad();                      // J3: heute als Helfer eingetragen? Erinnerung mit Direktlink
  elternMitbringLoad(kids);                    // Event-Mitbringliste: wer bringt was mit
  elternBuedchenLoad();                        // v646: Grillhütte – eigener Dienst und offene zum Übernehmen
  elternGespraechStatus();                     // laufende Elterngespräch-Anfrage anzeigen
  elternPollLoad();                            // Terminvorschläge des Trainers (Elterngespräch-Doodle)
  if(termin)elternTickerLoad(termin);          // Liveticker: Team des Kindes automatisch erkennen
  if(typeof pushRenderInto==="function")pushRenderInto("push-slot-eltern","parent"); // Push-An/Aus
  elternPushHinweis();                          // v694: Hinweis oben, solange keine Benachrichtigungen an sind
  elternMatchGrussLoad(kids);                   // A1/A2: Nach-dem-Spiel-Gruß pro Kind
  elternKannJetztLoad(kids);                    // Paket 1: „Das kann dein Kind jetzt"
  if(typeof teamLevelLoad==="function")teamLevelLoad("eltern-level-slot"); // C1: Team-Level
  if(WAESCHE_AKTIV)elternWaescheLoad(kids);    // Trikot-Wäsche-Rotator (aktuell ausgeblendet)
  elternSkillLoad(kids);   // Skill der Woche
  pulsNudgeLoad();         // Puls-Erinnerung fürs jüngste Event ohne Feedback
  elternChecklistLoad(kids); // „Erste Schritte"-Checkliste (Adoption)
  elternNewsLoad(kids);    // 📣 Adler News: Neues seit letztem Blick + roter Badge
  if(typeof appVersionInto==="function")appVersionInto("app-version-eltern");
  // Kam das Kind über „← Zurück zur Kabine" aus dem Quiz? Dann nicht im Eltern-Hub landen.
  let backToKabine=false; try{backToKabine=sessionStorage.getItem("adler_open_kabine")==="1";sessionStorage.removeItem("adler_open_kabine");}catch(e){}
  // PO: Reload in der Kabine warf das Kind zurueck in den Eltern-Hub. Der Kids-Modus ist
  // jetzt ein gemerkter Zustand (localStorage) - Ausgang nur ueber den Code.
  if(typeof kabineAktiv==="function"&&kabineAktiv())backToKabine=true;
  if(backToKabine)setTimeout(kabineOpen,50); else document.getElementById("kabine-splash")?.remove();
  // FEAT S: XP-Chips async füllen (RPC xp_total – Eltern sehen nur das eigene Kind)
  kids.forEach(k=>{xpTotal(k.spieler_id).then(t=>{const el=document.getElementById("xp-chip-"+k.spieler_id);if(el){const b=xpBadge(t);el.textContent=`${XP_ICON} ${t} ${XP_LABEL} · ${b.emo} ${b.t}`;}}).catch(()=>{});});
  // UX 3: Deep-Link-Intent genau einmal abarbeiten – zur Termin-Karte scrollen + kurz pulsen lassen
  if(rsvpIntent){
    try{sessionStorage.removeItem("adler_rsvp_intent");}catch(e){}
    const w=document.getElementById("termin-card");
    if(w){
      setTimeout(()=>{w.scrollIntoView({behavior:"smooth",block:"center"});
        try{w.animate([{transform:"scale(1)"},{transform:"scale(1.03)"},{transform:"scale(1)"}],{duration:600,iterations:2});}catch(e){}
      },200);
    }
  }
}

/* Grund zur Ab-/Krankmeldung: Chips fuer die haeufigsten Faelle + freies Feld.
   Aufloesung immer mit einem Wert (auch bei Ueberspringen), damit die Rueckmeldung
   selbst nie an diesem Fenster haengen bleibt. */
function rsvpGrundFragen(status){
  return new Promise(res=>{
    document.getElementById("rg-ov")?.remove();
    const chips=status==="krank"
      ? ["Erkältung","Fieber","Verletzung","Arzttermin"]
      : ["Urlaub","Familientermin","Schule/Hausaufgaben","Anderer Termin"];
    const ov=document.createElement("div"); ov.id="rg-ov";
    ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true");
    ov.style.cssText="position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:0";
    const fertig=v=>{ov.remove();res(v||null);};
    ov.onclick=e=>{if(e.target===ov)fertig(null);};
    ov.innerHTML=`<div style="background:#fff;color:#1a1a2e;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))">
      <div style="font-size:var(--s-karte);font-weight:800">${status==="krank"?"🤒 Kurzer Hinweis":"📝 Grund der Absage"}</div>
      <div style="font-size:var(--s-text);color:#64748b;margin:3px 0 12px">Freiwillig – hilft dem Trainerteam beim Planen.</div>
      <div id="rg-chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        ${chips.map(c=>`<button data-c="${esc(c)}" style="min-height:44px;padding:8px 14px;border:1.5px solid var(--rand-bedien);border-radius:22px;background:#fff;color:#334155;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${esc(c)}</button>`).join("")}
      </div>
      <input id="rg-txt" type="text" maxlength="120" placeholder="oder kurz selbst schreiben…" style="width:100%;box-sizing:border-box;min-height:46px;padding:10px 12px;border:1.5px solid var(--rand-bedien);border-radius:12px;font-family:inherit;font-size:var(--s-karte)">
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="rg-skip" style="flex:1;min-height:48px;border:1.5px solid var(--rand-bedien);border-radius:12px;background:#fff;color:#64748b;font-family:inherit;font-size:var(--s-karte);font-weight:700;cursor:pointer">Ohne Grund</button>
        <button id="rg-ok" style="flex:1.4;min-height:48px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">Speichern</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll("#rg-chips button").forEach(b=>b.onclick=()=>fertig(b.dataset.c));
    ov.querySelector("#rg-skip").onclick=()=>fertig(null);
    ov.querySelector("#rg-ok").onclick=()=>fertig((document.getElementById("rg-txt").value||"").trim()||null);
  });
}
async function elternRsvp(terminId,spielerId,status){
  let kommentar=null;
  // Der System-Dialog (prompt) sah fremd aus und riss aus der App heraus (PO) – jetzt ein
  // eigenes Fenster mit Schnellauswahl. Abbrechen = Rueckmeldung trotzdem speichern.
  if(status==="abgesagt"||status==="krank")kommentar=await rsvpGrundFragen(status);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:spielerId,status,kommentar,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Rückmeldung gespeichert ✓");
  // FEAT S: XP für Zusagen (idempotent pro Termin via quelle_id, Punktwert bestimmt der Server)
  if(status==="zugesagt"){const d=await xpAward(spielerId,"rsvp","t"+terminId);if(d>0)setTimeout(()=>toast(`${XP_ICON} +${d} ${XP_LABEL} gesammelt!`),1100);}
  elternDashLoad();
}
// Komfort für Mehrkind-Familien: alle eigenen Kinder mit einem Tap zusagen (nur die positive
// Sammel-Aktion, daher ohne Grund-Nachfrage). Federn je Kind idempotent, danach EIN Reload.
async function elternRsvpAllYes(terminId){
  const kids=window._elternKids||[]; let ok=0;
  for(const k of kids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:k.spieler_id,status:"zugesagt",updated_at:new Date().toISOString()})});
      if(r.ok){ok++; xpAward(k.spieler_id,"rsvp","t"+terminId).catch(()=>{});}
    }catch(e){}
  }
  if(ok){toast(`👍 ${ok} Kind${ok>1?"er":""} zugesagt`); try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}}
  else toast("Konnte nicht speichern","err");
  elternDashLoad();
}
// Rückmeldung wieder entfernen (erneuter Klick auf den aktiven Status). Eltern dürfen nur die
// Zeile des eigenen Kindes löschen (RLS). Gesammelte Adler-Federn bleiben (append-only Ledger).
async function elternRsvpClear(terminId,spielerId){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok){toast("Konnte nicht entfernen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Rückmeldung entfernt");
  elternDashLoad();
}
/* Schnell-Karussell: alle kommenden Termine als horizontal wischbare Karten, jede mit
   Zusage/Unsicher/Absage je Kind. Nutzt dieselben elternRsvp/elternRsvpClear wie oben. */
/* PO v407: „oben sollte immer der nächste Termin stehen und offenen Rückmeldung für
   Termine der nächsten 14 Tage."
   Der nächste Termin trägt seine Knöpfe selbst, deshalb ist er hier ausgenommen – sonst
   stünde dieselbe Frage zweimal untereinander. Weiter als 14 Tage wird bewusst nicht
   gefragt: eine Zusage für November hilft niemandem und macht den Block unlesbar.
   Gezeigt wird nur, was WIRKLICH offen ist; ist alles beantwortet, ist der Block weg. */
function elternOffeneRsvpHtml(rows,kids,rsvpAll,ausserId){
  const heute=isoLokal();
  const bis=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  rsvpAll=rsvpAll||{};
  const offen=(rows||[])
    .filter(t=>t.datum>=heute&&t.datum<=bis&&Number(t.id)!==Number(ausserId))
    .map(t=>({t,kinder:(kids||[]).filter(k=>!((rsvpAll[t.id]||{})[k.spieler_id]))}))
    .filter(x=>x.kinder.length);
  if(!offen.length)return "";
  const anzahl=offen.reduce((n,x)=>n+x.kinder.length,0);
  const zeilen=offen.map(({t,kinder})=>{
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
    const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
    const kidRows=kinder.map(k=>{
      const kd=k.kader||{};
      const btns=EP_RSVP_QUICK.map(s=>{
        const c=EP_RSVP[s];
        return `<button onclick="elternRsvp(${t.id},${k.spieler_id},'${s}')" aria-label="${esc(kd.name||"Kind")}: ${c.lbl}" style="flex:1;min-width:0;min-height:44px;padding:6px 3px;border-radius:10px;border:1.5px solid var(--rand-bedien);background:#fff;color:#334155;font-family:inherit;font-size:var(--s-klein);font-weight:700;line-height:1.15;cursor:pointer">${c.emo} ${c.lbl}</button>`;
      }).join("");
      return `<div style="margin-top:8px">
        <div style="font-size:var(--s-text);font-weight:700;margin-bottom:5px">${esc(kd.name||"Kind")}${kd.nr!=null?` <span style="color:var(--text3);font-weight:600">#${kd.nr}</span>`:""}</div>
        <div style="display:flex;gap:6px">${btns}</div></div>`;
    }).join("");
    return `<div style="border-top:1px solid #f1f5f9;margin-top:10px;padding-top:10px">
      <div role="button" tabindex="0" onclick="terminDetailOpen(${t.id})" style="cursor:pointer;min-height:44px;display:flex;align-items:center;gap:6px;font-size:var(--s-text);font-weight:800">${m.icon} ${esc(t.titel||t.gegner||m.label)} <span style="margin-left:auto;color:#2563eb" aria-hidden="true">›</span></div>
      <div style="font-size:var(--s-klein);color:#64748b">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}${t.platz?" · 🏟️ "+esc(t.platz):""}</div>
      ${kidRows}</div>`;
  }).join("");
  return `<div id="eltern-offen-card" style="background:#fff;border:2px solid #f59e0b;border-radius:14px;padding:14px 16px 16px;margin-bottom:12px;box-shadow:0 4px 16px rgba(245,158,11,.18)">
    <div style="display:flex;align-items:baseline;gap:8px">
      <div style="font-size:var(--s-karte);color:#b45309;font-weight:900">❗ Rückmeldung fehlt</div>
      <div style="margin-left:auto;font-size:var(--s-klein);color:#64748b">${anzahl} offen · nächste 14 Tage</div>
    </div>
    ${zeilen}</div>`;
}
/* Jede Antwort baut das Dashboard komplett neu – und ein frisches Element fängt bei
   scrollLeft 0 an. Wer im Termin-Karussell nach rechts gewischt hatte, stand nach dem
   Antippen wieder ganz links und musste sich zum nächsten offenen Termin zurückwischen.
   Elemente mit data-scrollkeep behalten deshalb ihre Position über den Neuaufbau hinweg.
   Wichtig: der Schlüssel steht im Markup, nicht in einer Liste hier – ein neues Karussell
   trägt sein Attribut mit und ist damit automatisch dabei. */
function _epScrollMerken(wurzel){
  const merk={};
  (wurzel||document).querySelectorAll("[data-scrollkeep]").forEach(el=>{
    if(el.scrollLeft>0)merk[el.dataset.scrollkeep]=el.scrollLeft;
  });
  return merk;
}
function _epScrollZurueck(merk,wurzel){
  if(!merk)return;
  (wurzel||document).querySelectorAll("[data-scrollkeep]").forEach(el=>{
    const x=merk[el.dataset.scrollkeep];
    // scroll-snap würde eine sanfte Bewegung mitanimieren – hier soll es einfach dastehen
    if(x>0)el.scrollLeft=x;
  });
}
/* v666 PO: „Wenn ich bei den kommenden Terminen auf den Daumen klicke, dann rutscht das Bild ein
   Stück runter und ich muss wieder hoch scrollen." Nach dem Neuaufbau füllen sich die Karten
   darüber (Wetter, Betreuung, Helfer …) erst nach und nach und schieben alles darunter weg.
   Das Termin-Karussell bleibt deshalb dort stehen, wo es beim Antippen war – solange die
   Karten nachladen, höchstens drei Sekunden und nie gegen eine Bewegung des Nutzers. */
function _epScroller(el){
  for(let p=el&&el.parentElement;p;p=p.parentElement){
    const oy=getComputedStyle(p).overflowY;
    if((oy==="auto"||oy==="scroll")&&p.scrollHeight>p.clientHeight)return p;
  }
  return document.scrollingElement||document.documentElement;
}
function _epAnkerMerken(wurzel){
  const a=(wurzel||document).querySelector('[data-scrollkeep="termine"]'); if(!a)return null;
  const top=a.getBoundingClientRect().top;
  if(top<0||top>window.innerHeight)return null;   // nicht im Blick → nichts festzuhalten
  return {top};
}
function _epAnkerHalten(vor,wurzel){
  if(!vor)return;
  let aus=false; const stopp=()=>{aus=true;};
  const ausrichten=()=>{
    if(aus)return;
    const a=(wurzel||document).querySelector('[data-scrollkeep="termine"]'); if(!a)return;
    const d=a.getBoundingClientRect().top-vor.top;
    if(Math.abs(d)>1){ const sc=_epScroller(a); sc.scrollTop+=d; }
  };
  ausrichten();
  ["touchstart","wheel","keydown"].forEach(ev=>window.addEventListener(ev,stopp,{once:true,passive:true}));
  let ro=null;
  try{ ro=new ResizeObserver(ausrichten); ro.observe(wurzel||document.body); }catch(e){}
  setTimeout(()=>{ aus=true; try{ro&&ro.disconnect();}catch(e){} },3000);
}
/* PO: „Event fotos passt nicht zum training vom wording her. ist ja kein Event."
   Stimmt – „Event" war der Name der Technik (event_helfer, Galerie am Termin), nicht der
   Sache. Der Knopf heißt jetzt, was er zeigt. */
function fotoLabel(typ){
  return {training:"Trainings-Fotos",spiel:"Spiel-Fotos",turnier:"Turnier-Fotos"}[typ]||"Event-Fotos";
}
/* v685/v686 – Aus dem Wisch-Karussell wird eine ruhige Liste. Die Zu-/Absage-Knöpfe standen auf
   dem Dashboard dreimal für dieselben Termine (Nächster Termin, Rückmeldung fehlt, Karussell),
   und was rechts aus dem Bild ragte, sah niemand. Jetzt: je Termin eine Zeile mit dem Stand je
   Kind in Worten und Zeichen – ein Tipp öffnet die Details, dort wird geantwortet. Geantwortet
   wird oben (Nächster Termin, Rückmeldung fehlt), hier wird nur nachgesehen. */
function elternTermineCarouselHtml(rows,kids,rsvpAll,ohneId){
  const bis=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  rsvpAll=rsvpAll||{};
  // was unter „Rückmeldung fehlt“ steht (14 Tage, ein Kind ohne Antwort), steht hier nicht noch einmal
  const offenOben=t=>t.datum<=bis&&(kids||[]).some(k=>!((rsvpAll[t.id]||{})[k.spieler_id]));
  const liste=(rows||[]).filter(t=>Number(t.id)!==Number(ohneId)&&!offenOben(t)).slice(0,4);
  if(!liste.length)return "";
  rsvpAll=rsvpAll||{};
  const zeilen=liste.map(t=>{
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=t.treffzeit?("Treffen "+String(t.treffzeit).slice(0,5)):(t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"");
    const rr=rsvpAll[t.id]||{};
    const stand=(kids||[]).map(k=>{
      const kd=k.kader||{}, st=rr[k.spieler_id]||null, c=st&&EP_RSVP[st];
      const txt=c?`${c.emo} ${c.lbl}`:"❗ offen";
      return `<span style="display:inline-block;font-size:var(--s-klein);font-weight:800;color:${c?"var(--text2)":"#b45309"};margin-right:8px">${(kids||[]).length>1?esc(kd.name||"Kind")+": ":""}${txt}</span>`;
    }).join("");
    return `<button type="button" onclick="terminDetailOpen(${t.id})" style="display:flex;align-items:center;gap:12px;width:100%;min-height:56px;text-align:left;padding:10px 12px;margin-top:8px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:inherit;font-family:inherit;cursor:pointer">
      <span style="font-size:var(--s-teil);line-height:1" aria-hidden="true">${m.icon}</span>
      <span style="flex:1;min-width:0">
        <span style="display:block;font-size:var(--s-text);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.titel||t.gegner||m.label)}</span>
        <span style="display:block;font-size:var(--s-klein);color:#475569">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}</span>
        <span style="display:block;margin-top:2px">${stand}</span>
      </span>
      <span style="font-size:var(--s-teil);color:#64748b" aria-hidden="true">›</span>
    </button>`;
  }).join("");
  return `<div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:800;font-size:var(--s-karte)">📅 Danach</div>
    ${zeilen}
  </div>`;
}

/* Großes Termin-Fenster (Eltern): alle Infos zu einem Termin – Adresse, Spielform,
   Rückmeldung je Kind, Betreuung (Training), Büdchen-Einteilung (Heimspiel),
   Nominierungsstatus, Wetter. Aktionen zeichnen das Fenster frisch (terminDetailOpen). */
// Adresse fürs Eltern-Detailfenster: echte Adresse als Karten-Link; beim Heimspiel ohne
// Eintrag die Vereinsadresse; beim Auswärtsspiel ohne Eintrag ein klarer Hinweis.
function tdAdresse(t){
  if(t.ort)return mapsAnchor(t.ort,null,true);
  if(t.heim===true)return mapsAnchor(VEREIN_ADRESSE,null,true);
  if((t.typ==="spiel"||t.typ==="turnier")&&t.heim===false)return '<span style="color:#b45309">folgt – bitte beim Trainer erfragen</span>';
  return "";
}
async function terminDetailOpen(id){
  const t=(ELTERN_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const kids=window._elternKids||[];
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const tz=t.treffzeit?String(t.treffzeit).slice(0,5):"";
  const zeit=t.uhrzeit?(tz?`🕒 Treffen ${tz} · ${t.typ==="spiel"||t.typ==="turnier"?"Anstoß":"Beginn"} ${String(t.uhrzeit).slice(0,5)} Uhr`:String(t.uhrzeit).slice(0,5)+" Uhr"):"";
  const istSpiel=(t.typ==="spiel"||t.typ==="turnier");
  const kidIds=kids.map(k=>k.spieler_id);
  let rsvp={};
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${t.id}&spieler_id=in.(${kidIds.join(",")})&select=spieler_id,status`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>rsvp[x.spieler_id]=x.status);}catch(e){}
  document.getElementById("td-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="td-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Termin-Details");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10040;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:460px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const rsvpRows=kids.map(k=>{
    const kd=k.kader||{}, st=rsvp[k.spieler_id]||null;
    const btns=Object.keys(EP_RSVP).map(s=>{const on=st===s,cc=EP_RSVP[s];
      const act=on?`tdRsvp(${t.id},${k.spieler_id},null)`:`tdRsvp(${t.id},${k.spieler_id},'${s}')`;
      return `<button onclick="${act}" style="flex:1;min-width:0;min-height:44px;padding:6px 3px;border-radius:9px;border:1.5px solid ${on?cc.col:"var(--rand-bedien)"};background:${on?cc.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:var(--s-klein);font-weight:700;line-height:1.15;cursor:pointer">${cc.emo} ${cc.lbl}</button>`;
    }).join("");
    return `<div style="margin-top:8px"><div style="font-size:var(--s-text);font-weight:700;margin-bottom:4px">${esc(kd.name||"Kind")}</div><div style="display:flex;gap:6px">${btns}</div></div>`;
  }).join("");
  const infoRow=(icon,label,val)=> val?`<div style="display:flex;gap:8px;font-size:var(--s-text);padding:4px 0"><span style="width:20px">${icon}</span><span style="color:#64748b;min-width:72px">${label}</span><span style="flex:1;font-weight:600;min-width:0">${val}</span></div>`:"";
  // Rohwerte aus dem Termin ("funino"/"4+1"/"5+1") sagen Eltern nichts - deshalb ausschreiben.
  const SF_KLARTEXT={funino:"FUNiño (3 gegen 3 auf 4 Minitore, ohne Torwart)","3+1":"3+1 (drei Feldspieler + Torwart)","4+1":"4+1 (vier Feldspieler + Torwart)","5+1":"5+1 (fünf Feldspieler + Torwart)"};
  /* v708: mehrere Formen (auswärts bietet der Gastgeber oft zwei an) – je Form eine Zeile. */
  const sfL=sfListe(t.spielform).map(x=>SF_KLARTEXT[x.toLowerCase()]||x);
  const spielformLbl = (istSpiel&&sfL.length)?`${sfL.map(esc).join("<br>")}${t.spieldauer_min?`<br>${t.halbzeiten||1}× ${t.spieldauer_min} Min`:""}`:"";
  c.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px">
      <div style="font-size:var(--s-teil);font-weight:800;min-width:0">${m.icon} ${esc(t.titel||t.gegner||m.label)}</div>
      <button aria-label="Schließen" onclick="document.getElementById('td-modal').remove()" style="min-width:44px;min-height:44px;border:none;background:none;font-size:var(--s-seite);color:var(--text3);cursor:pointer;line-height:1;flex:none">×</button>
    </div>
    <div style="font-size:var(--s-text);color:#64748b;margin-bottom:10px">${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}${zeit?" · "+zeit:""}</div>
    <div id="td-wetter" style="margin-bottom:6px"></div>
    ${istSpiel?infoRow(t.heim===true?"🏠":t.heim===false?"✈️":"❓","Spielort", t.heim===true?"Heimspiel":t.heim===false?"Auswärtsspiel":'<span style="color:#b45309">Heim/Auswärts trägt der Trainer noch nach</span>'):""}
    ${infoRow("📍","Adresse", tdAdresse(t))}
    ${(t.ort||t.heim===true)?routeBtn(t.ort||VEREIN_ADRESSE,{block:true}):""}
    ${infoRow("🏟️","Platz", t.platz?esc(t.platz):"")}
    ${infoRow("⚽","Spielform", spielformLbl)}
    <div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
      <div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">✅ Rückmeldung</div>
      ${rsvpRows||'<div style="font-size:var(--s-text);color:var(--text3)">Kein Kind zugeordnet.</div>'}
    </div>
    ${tdWasMussMit(t)}
    <div id="td-vorbericht"></div>
    <div id="td-nom"></div>
    <div id="td-betreuung"></div>
    <div id="td-buedchen"></div>
    <div id="td-helfer"></div>
    ${t.typ==="event"?'<div id="td-mitbring"></div>':""}
    <button onclick="galerieOpen(${Number(t.id)},'${(t.titel||t.gegner||"").replace(/'/g,"")}')" style="width:100%;margin-top:14px;padding:11px;border:1.5px solid #7c3aed;border-radius:10px;background:#faf5ff;color:#6d28d9;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📸 ${fotoLabel(t.typ)} ansehen &amp; hochladen</button>
    <button onclick="document.getElementById('td-modal').remove()" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:10px;background:#f1f5f9;color:#334155;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
  window._tdTermin=t; // fürs Nachladen der Mitbringliste nach dem Eintragen
  if(istSpiel&&(t.gegner||t.titel))tdVorberichtLoad(t);
  if(t.datum)wetterInto("td-wetter",t.datum,t.ort,t.uhrzeit);
  tdNomLoad(t,kids);
  if(t.typ==="training")tdBetreuungLoad(t,kids);
  if(istSpiel&&t.heim===true)tdBuedchenLoad(t);
  tdHelferLoad(t); // G4: Elternhelfer-Board (nur kommende Termine)
  // „Wie war's" (Puls) lebt jetzt NUR im Zu-erledigen-Fenster (PO: der Termin wandert
  // nach der Endzeit ins Archiv, dort würde die Smiley-Frage niemand mehr finden).
  if(t.typ==="event"&&t.mitbringen)tdMitbringLoad(t); // Mitbringliste nur, wenn der Trainer sie eingeschaltet hat (v566)
}
/* Mitbringliste im Termin-Detail: gleiche Liste wie im Zu-erledigen-Fenster, aber IMMER
   einsehbar und änderbar – auch nachdem die Familie schon etwas eingetragen hat. */
async function tdMitbringLoad(t){
  const box=document.getElementById("td-mitbring"); if(!box)return;
  const kids=window._elternKids||[];
  let items=[]; try{const map=await mitbringItems([t.id]);items=map[t.id]||[];}catch(e){}
  let uid=""; try{uid=sbUserId()||"";}catch(e){}
  const kidOpts=kids.map(k=>`<option value="${k.spieler_id}">${esc((k.kader&&k.kader.name)||"Kind")}</option>`).join("");
  const liste=items.length
    ? items.map(it=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:5px 0;border-top:1px solid #f1f5f9">
        <span style="flex:1">🍽️ <b>${esc(it.was)}</b>${it.wer?` <span style="color:var(--text3)">· ${esc(it.wer)}</span>`:""}</span>
        ${(uid&&it.created_by===uid)?`<button onclick="mitbringDelete(${it.id})" aria-label="Eintrag löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px;font-size:var(--s-karte)">✕</button>`:""}
      </div>`).join("")
    : '<div style="font-size:var(--s-text);color:var(--text3);padding:4px 0">Noch nichts eingetragen – mach den Anfang! 🎉</div>';
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">🎉 Mitbringliste</div>
    <div style="font-size:var(--s-klein);color:#64748b;margin-bottom:6px">Wer bringt was mit? (Salat, Kuchen, Getränke, Pavillon …)</div>
    ${liste}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      <input id="mb-was-${t.id}" placeholder="Was bringst du mit?" style="flex:1;min-width:140px;min-height:44px;padding:9px;border:1.5px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text)" onkeydown="if(event.key==='Enter')mitbringAdd(${t.id})">
      ${kids.length>1?`<select id="mb-kid-${t.id}" style="min-height:44px;padding:9px;border:1.5px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:#fff">${kidOpts}</select>`:""}
      <button onclick="mitbringAdd(${t.id})" style="min-height:44px;padding:9px 16px;border:none;border-radius:10px;background:#15803d;color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Eintragen</button>
    </div>
  </div>`;
}
/* F4: Eltern-Puls – anonyme 1-Tap-Stimmung nach Training/Spiel. Der Trainer sieht nur das
   Aggregat (puls_aggregate, keine user_ids). Ein Datensatz pro Elternteil/Termin (upsert). */
async function tdPulsLoad(t){
  const box=document.getElementById("td-puls"); if(!box)return;
  const today=isoLokal();
  if(!(["training","spiel","turnier"].includes(t.typ)&&t.datum<=today)){box.innerHTML="";return;}
  let mine=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/event_puls?termin_id=eq.${t.id}&select=mood,kommentar`,{headers:sbAuthHeaders()});if(r.ok){mine=(await r.json())[0]||null;}}catch(e){}
  tdPulsRender(t.id,mine);
}
function tdPulsRender(terminId,mine,bare){
  const box=document.getElementById("td-puls"); if(!box)return;
  const moods=[{v:3,e:"😀",l:"Top"},{v:2,e:"😐",l:"Ok"},{v:1,e:"😟",l:"Naja"}];
  const cur=mine?mine.mood:null;
  box.dataset.mood=cur||"";
  box.innerHTML=`<div style="${bare?"":"border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px"}">
    ${bare?"":`<div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">🌡️ Wie war's? <span style="font-weight:400;color:var(--text3);font-size:var(--s-klein)">(anonym, nur fürs Trainerteam)</span></div>`}
    <div style="display:flex;gap:8px;margin:8px 0">
      ${moods.map(mo=>{const on=cur===mo.v;return `<button onclick="tdPulsSave(${terminId},${mo.v})" style="flex:1;padding:10px 6px;border-radius:10px;border:1.5px solid ${on?"#1e3a8a":"var(--rand-bedien)"};background:${on?"#eef2ff":"#fff"};cursor:pointer;font-family:inherit"><div style="font-size:var(--s-seite)">${mo.e}</div><div style="font-size:var(--s-klein);color:#64748b">${mo.l}</div></button>`;}).join("")}
    </div>
    <input id="td-puls-txt" type="text" maxlength="200" value="${mine&&mine.kommentar?esc(mine.kommentar):""}" placeholder="Optional: ein Satz Feedback…" onblur="tdPulsSaveText(${terminId})" style="width:100%;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);box-sizing:border-box">
    <div id="td-puls-done" style="font-size:var(--s-klein);color:#16a34a;margin-top:4px">${cur?"Danke fürs Feedback ✓":""}</div>
  </div>`;
}
async function tdPulsSave(terminId,mood){
  const txt=(document.getElementById("td-puls-txt")?.value||"").trim().slice(0,200);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_puls?on_conflict=termin_id,user_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,mood,kommentar:txt||null})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
    tdPulsRender(terminId,{mood,kommentar:txt});
    try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}
    // Abgestimmt im Zu-erledigen-Fenster? Dann verschwindet das To-Do nach kurzem „Danke ✓"
    // (elternTodoSync zieht den Zähler über den MutationObserver automatisch nach).
    const nud=document.getElementById("puls-nudge-slot");
    if(nud&&nud.contains(document.getElementById("td-puls"))){
      setTimeout(()=>{const n2=document.getElementById("puls-nudge-slot");if(n2){n2.innerHTML="";pulsNudgeLoad();}},1400);
    }
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tdPulsSaveText(terminId){
  const box=document.getElementById("td-puls"); const mood=box&&box.dataset.mood?Number(box.dataset.mood):0;
  if(!mood)return; // Stimmung zuerst wählen (mood ist Pflicht)
  const txt=(document.getElementById("td-puls-txt")?.value||"").trim().slice(0,200);
  try{await fetch(`${SB_URL}/rest/v1/event_puls?on_conflict=termin_id,user_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,mood,kommentar:txt||null})});}catch(e){if(typeof toast==="function")toast("Kommentar konnte nicht gespeichert werden","err");}
}

/* „Erste Schritte"-Checkliste: führt neue Familien durch die Einrichtung (Push, Notfallkarte,
   Foto-Freigabe, Fairplay-Codex). Erkennt den Status live; ausblendbar bis zum nächsten Tag;
   verschwindet ganz, sobald alles erledigt ist. Treibt die Adoption der Eltern-Features. */
async function elternChecklistLoad(kids){
  const slot=document.getElementById("eltern-checklist-slot"); if(!slot)return;
  kids=kids||[];
  try{ if(localStorage.getItem("adler_setup_hide")===isoLokal()){slot.innerHTML="";return;} }catch(e){}
  let committed=false; const notfallIds=new Set();
  try{const r=await fetch(`${SB_URL}/rest/v1/fairplay_commit?select=committed_at&limit=1`,{headers:sbAuthHeaders()});if(r.ok)committed=((await r.json())||[]).length>0;}catch(e){}
  try{const ids=kids.map(k=>k.spieler_id).join(",");if(ids){const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?spieler_id=in.(${ids})&select=spieler_id`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>notfallIds.add(x.spieler_id));}}catch(e){}
  /* v636: „geklärt“ heißt: die Familie hat entschieden – Ja ODER Nein. Vorher zählte nur ein Ja,
     wer „Nein“ sagte, wurde dauerhaft gemahnt („ein Nein hat keinerlei Nachteile“). */
  const fotoIds=new Set();
  try{const ids=kids.map(k=>k.spieler_id).join(",");if(ids){const r=await fetch(`${SB_URL}/rest/v1/foto_consent?spieler_id=in.(${ids})&select=spieler_id`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>fotoIds.add(x.spieler_id));}}catch(e){}
  /* v660 PO 28.09.: Eltern tragen ihre eigenen Angaben ein, den Geburtstag ihres Kindes und
     dessen Fan-Fakten. Erledigt heißt: alles ausgefüllt. */
  let angaben=null; const fanIds=new Set();
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_angaben?select=vorname,nachname,handy,geburtstag`,{headers:sbAuthHeaders()});if(r.ok)angaben=((await r.json())||[])[0]||null;}catch(e){}
  try{const ids=kids.map(k=>k.spieler_id).join(",");if(ids){const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=in.(${ids})&select=spieler_id`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>fanIds.add(x.spieler_id));}}catch(e){}
  const angabenOk=!!(angaben&&angaben.vorname&&angaben.nachname&&angaben.handy&&angaben.geburtstag);
  const gebAll=kids.length>0&&kids.every(k=>k.kader&&k.kader.geb);
  const fanAll=kids.length>0&&kids.every(k=>fanIds.has(k.spieler_id));
  const kFan=kids.find(k=>!fanIds.has(k.spieler_id))||kids[0]||{}, nFan=((kFan.kader&&kFan.kader.name)||"").replace(/'/g,"");
  const pushOn=(typeof Notification!=="undefined"&&Notification.permission==="granted");
  const fotoAll=kids.length>0&&kids.every(k=>fotoIds.has(k.spieler_id)||(k.kader&&k.kader.foto_stadionheft_ok));
  const notfallAll=kids.length>0&&kids.every(k=>notfallIds.has(k.spieler_id));
  const k0=kids[0]||{}, n0=((k0.kader&&k0.kader.name)||"").replace(/'/g,"");
  const items=[
    {done:pushOn,     icon:"🔔", label:"Benachrichtigungen aktivieren", act:`pushSubscribe('parent').then(ok=>{if(ok)elternChecklistLoad(window._elternKids||[]);})`},
    {done:notfallAll, icon:"🚑", label:"Notfallkarte hinterlegen",       act:`notfallOpen(${k0.spieler_id},'${n0}')`},
    {done:fotoAll,    icon:"📸", label:"Foto-Freigabe klären",           act:`elternFotoConsentOpen(${k0.spieler_id},'${n0}')`},
    {done:committed,  icon:"🤝", label:"Unsere Vereinbarung bestätigen",  act:`vereinbarungOpen()`},
    {done:angabenOk,  icon:"👤", label:"Deine Angaben eintragen",         act:`elternAngabenOpen()`},
    {done:gebAll,     icon:"🎂", label:kids.length===1?`Geburtstag von ${esc((k0.kader&&k0.kader.name)||"deinem Kind")}`:"Geburtstage deiner Kinder", act:`elternAngabenOpen()`},
    {done:fanAll,     icon:"✏️", label:`Fan-Fakten von ${esc((kFan.kader&&kFan.kader.name)||"deinem Kind")}`, act:`elternFanfactsOpen(${kFan.spieler_id},'${nFan}')`}
  ];
  const open=items.filter(i=>!i.done).length;
  if(open===0){ slot.innerHTML=""; return; }
  const total=items.length, done=total-open;
  const rows=items.map(i=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #f1f5f9">
      <span style="font-size:var(--s-teil);width:24px;text-align:center">${i.done?"✅":i.icon}</span>
      <span style="flex:1;font-size:var(--s-text);${i.done?"color:var(--text3);text-decoration:line-through":"font-weight:600"}">${i.label}</span>
      ${i.done?'<span style="font-size:var(--s-klein);color:#16a34a;font-weight:700">erledigt</span>':`<button onclick="${i.act}" style="padding:6px 12px;border:1.5px solid #1e3a8a;border-radius:8px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">öffnen</button>`}
    </div>`).join("");
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05);border:1.5px solid #bfdbfe">
    <div style="display:flex;align-items:center;gap:8px"><div style="font-weight:800;font-size:var(--s-karte)">🚀 Erste Schritte</div><span style="margin-left:auto;font-size:var(--s-klein);color:#64748b">${done}/${total} erledigt</span></div>
    <div style="height:6px;background:#e2e8f0;border-radius:4px;margin:8px 0;overflow:hidden"><div style="height:100%;width:${Math.round(done/total*100)}%;background:#16a34a;transition:width .3s"></div></div>
    ${rows}
    <button onclick="elternChecklistDismiss()" style="width:100%;min-height:44px;margin-top:10px;padding:8px;border:none;background:none;color:var(--text3);font-family:inherit;font-size:var(--s-klein);cursor:pointer">Später · für heute ausblenden</button>
  </div>`;
}
function elternChecklistDismiss(){ try{localStorage.setItem("adler_setup_hide",isoLokal());}catch(e){} const s=document.getElementById("eltern-checklist-slot"); if(s)s.innerHTML=""; }
/* Puls-Erinnerung: sanfter Nudge für das jüngste vergangene Training/Spiel (≤14 Tage), zu dem
   dieser Elternteil noch KEIN Puls-Feedback gegeben hat. Ein Tap genügt (nutzt tdPulsRender/Save). */
async function pulsNudgeLoad(){
  const slot=document.getElementById("puls-nudge-slot"); if(!slot)return;
  const heute=isoLokal();
  const vor14=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  let evs=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,typ,titel,gegner,datum&typ=in.(training,spiel,turnier)&datum=lt.${heute}&datum=gte.${vor14}&order=datum.desc&limit=6`,{headers:sbAuthHeaders()});if(r.ok)evs=await r.json();}catch(e){}
  if(!evs.length)return;
  let answered=new Set();
  try{const ids=evs.map(e=>e.id).join(",");const r=await fetch(`${SB_URL}/rest/v1/event_puls?termin_id=in.(${ids})&select=termin_id`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>answered.add(x.termin_id));}catch(e){}
  const first=evs.find(e=>!answered.has(e.id));
  if(!first)return;
  const m=(typeof TM_META!=="undefined"&&TM_META[first.typ])||{icon:"📅",label:first.typ};
  const d=new Date(first.datum+"T00:00:00"), ds=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+", "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05);border:1.5px solid #bfdbfe">
    <div style="font-weight:700;font-size:var(--s-karte);margin-bottom:2px">🌡️ Wie war ${m.icon} ${esc(first.titel||first.gegner||m.label)}?</div>
    <div style="font-size:var(--s-klein);color:#64748b">${ds} · anonym, nur fürs Trainerteam – ein Tap genügt.</div>
    <div id="td-puls"></div>
    <button onclick="elternCatClose();galerieOpen(${first.id},'${(first.titel||first.gegner||"").replace(/'/g,"")}')" style="width:100%;min-height:44px;margin-top:8px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#faf5ff;color:#6d28d9;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📸 Fotos davon in die Team-Galerie laden</button>
  </div>`;
  tdPulsRender(first.id,null,true);
}
/* J3: Helfer-Erinnerung – hast du dich für HEUTE als Helfer eingetragen (Fotos, Live-Ticker,
   Aufbau, Betreuung)? Dann erscheint ein To-Do mit Direktlink zur passenden Funktion. */
async function elternHelferTodoLoad(){
  const slot=document.getElementById("helfer-todo-slot"); if(!slot)return;
  const uid=_sbUid(); if(!uid){slot.innerHTML="";return;}
  const heute=isoLokal();
  const heutige=(ELTERN_TERMINE||[]).filter(t=>t.datum===heute);
  if(!heutige.length){slot.innerHTML="";return;}
  let rows=[];
  try{const ids=heutige.map(t=>t.id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/event_helfer?user_id=eq.${uid}&termin_id=in.(${ids})&select=termin_id,aufgabe`,{headers:sbAuthHeaders()});
    if(r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){slot.innerHTML="";return;}
  slot.innerHTML=rows.map(x=>{
    const t=heutige.find(tt=>tt.id===x.termin_id)||{};
    const titel=esc(t.titel||t.gegner||"heute");
    let aktion="";
    if(x.aufgabe.includes("Ticker"))aktion=`<button onclick="location.href=location.pathname+'?ticker=${t.datum}'" style="width:100%;min-height:44px;margin-top:8px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📻 Zum Liveticker</button>`;
    else if(x.aufgabe.includes("Foto"))aktion=`<button onclick="elternCatClose();galerieOpen(${t.id},'${(t.titel||t.gegner||"").replace(/'/g,"")}')" style="width:100%;min-height:44px;margin-top:8px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📸 Zur Event-Galerie</button>`;
    return `<div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;border-left:4px solid #0ea5e9;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <div style="font-weight:800;font-size:var(--s-text);color:#0f172a">🙌 Heute bist du dran: ${esc(x.aufgabe)}</div>
      <div style="font-size:var(--s-klein);color:#64748b;margin-top:2px">Du hast dich bei „${titel}“ eingetragen – danke, dass du hilfst!</div>
      ${aktion}
    </div>`;}).join("");
}
/* G4: Elternhelfer-Board – pro kommendem Termin tragen sich Eltern für Aufgaben ein
   (Fahren, Aufbau, Fotografieren …). Alle eingeloggten sehen die Liste (Koordination). */
/* PO-Feinschliff: Fahren raus (dafür gibt's die Fahrgemeinschaft), Getränke/Wäsche raus
   (organisiert jede Familie selbst). NEU: Live-Ticker – wer tippt während des Spiels? */
/* PO: „live Ticker und Betreuung unten brauchen wir beim Training nicht. nur bei spiel und
   turnier." Beides hängt am Spielbetrieb: getickert wird ein Spiel, und die Betreuung meint
   die Kinder in den Pausen zwischen den Spielen. Beim Training gibt es weder das eine noch
   das andere – dort steht die Frage „bleibst du vor Ort?" schon eine Karte weiter oben. */
/* PO/Markus: „sinnvoll, wenn wir vorher schreiben, was Hilfe beim Aufbau bedeutet." Bis v426
   stand hier nur ein Wort auf einem Knopf – wer „Aufbau" antippte, sagte etwas zu, das er
   nicht kannte (wann da sein? wie lange? was genau?). Null Eintraege in event_helfer sind
   die Quittung. Jede Aufgabe sagt jetzt Zeitpunkt, Taetigkeit und Dauer.
   ⚠️ Der Aufgaben-TEXT ist der Schluessel: event_helfer.aufgabe speichert ihn woertlich,
   Ein- und Austragen vergleichen darauf. Beschreibungen duerfen sich aendern, `t` NICHT. */
const HELFER_AUFGABEN=[
  /* Beim Training wird nicht „aufgebaut", da werden Tore getragen – und zwar zweierlei.
     Der Trainer sagt am Termin, wie viele; ohne Angabe steht die Aufgabe ohne Zahl da
     (nie eine erfinden), bei ausdruecklicher 0 entfaellt sie ganz (Halle, Techniktraining). */
  {t:"🥅 Funino-Tore",   typen:["training"], zahl:t=>t&&t.helfer_funino, vor:15,
   kurz:t=>helferAnzahl(t&&t.helfer_funino,"Funino-Tore",true),
   d:t=>`${helferAbSatz(t,15)} da sein und ${helferAnzahl(t&&t.helfer_funino,"Funino-Tore")} aufstellen.`},
  {t:"🥅 Jugendtore",    typen:["training"], zahl:t=>t&&t.helfer_jugendtore, vor:15,
   kurz:t=>helferAnzahl(t&&t.helfer_jugendtore,"Jugendtore",true),
   d:t=>`${helferAbSatz(t,15)} da sein und ${helferAnzahl(t&&t.helfer_jugendtore,"Jugendtore")} aufstellen.`},
  /* v580 (PO 19.09.): „Bei Auswärtsspielen ist im Eltern-Zugang der Punkt beim Aufbauen
     helfen nicht relevant." Aufgebaut wird beim Gastgeber – wer auswärts spielt, kommt an
     ein fertiges Feld. Die Aufgabe entfällt deshalb bei einem ausdrücklichen Auswärtsspiel.
     Solange der Trainer Heim/Auswärts noch NICHT eingetragen hat (`heim` ist null), bleibt
     sie stehen: Eine Aufgabe zu früh wegzulassen kostet Helfer, eine zu viel nur einen
     Blick. Wer sich schon eingetragen hatte, findet seinen Eintrag weiter in der Liste
     darüber und kann ihn dort entfernen. */
  {t:"🛠️ Aufbau",        typen:["spiel","turnier","event","training"], vor:30,
   wenn:t=>!(t&&t.heim===false),
   kurz:()=>"Aufbau",
   d:t=>`${helferAbSatz(t,30)} da sein und mit dem Trainerteam Tore, Hütchen und Bälle aufbauen – etwa 15 Minuten.`},
  /* v662: Abbau – PO „kann Aufbau und Abbau betreffen“. */
  {t:"🧹 Abbau",         typen:["spiel","turnier","event","training"],
   kurz:()=>"Abbau",
   d:()=>"Nach dem Ende mit dem Trainerteam Tore, Hütchen und Bälle wegräumen – etwa 15 Minuten."},
  {t:"👀 Betreuung",     typen:["spiel","turnier"],
   kurz:()=>"Betreuung in den Pausen",
   d:()=>"In den Pausen bei den Kindern bleiben, damit das Trainerteam das nächste Spiel vorbereiten kann. Auch eine Halbzeit hilft."},
  {t:"📻 Live-Ticker",   typen:["spiel","turnier"],
   kurz:()=>"Live-Ticker tippen",
   d:()=>"Während des Spiels kurze Meldungen in der App tippen – für alle, die nicht dabei sein können."},
  {t:"📸 Fotografieren", typen:["spiel","turnier","event"],
   kurz:()=>"Fotos machen",
   d:()=>"Ein paar Fotos machen und sie danach in die Galerie laden. Das Handy reicht völlig."}
];
/* „8 Funino-Tore" wenn die Zahl steht, sonst „die Funino-Tore" – niemals eine geratene Zahl.
   Die 0 kommt hier nie an: sie filtert die Aufgabe vorher aus der Liste.
   `knapp` fuer die Kachel: dort steht die Aufgabe allein in einer Zeile, ein „die" davor
   liest sich wie ein angefangener Satz. */
function helferAnzahl(n,was,knapp){
  if(n==null||n==="")return knapp?was:("die "+was);
  return Number(n)+" "+was;
}
/* „Ab wann?" beantwortet die App selbst, statt eine feste Uhrzeit in den Text zu schreiben.
   Grundlage ist die Treffzeit, wenn es eine gibt (Spiel/Turnier), sonst der Beginn.
   Der Vorlauf haengt an der AUFGABE, nicht an einer allgemeinen Regel: beim Training sind
   zwei Tore in einer Viertelstunde aufgestellt (PO), ein Spieltags-Aufbau dauert laenger.
   Ohne verwertbare Zeit bleibt der Satz allgemein, statt eine Uhrzeit zu erfinden. */
function helferVorlaufWort(min){ return min===15?"Eine Viertelstunde":"Eine halbe Stunde"; }
function helferZeit(t,min){
  const m=String((t&&t.treffzeit)||(t&&t.uhrzeit)||"").match(/(\d{1,2}):(\d{2})/);
  if(!m)return "";
  const x=(+m[1])*60+(+m[2])-(min||30);
  if(x<0)return "";
  return `${String(Math.floor(x/60)).padStart(2,"0")}:${String(x%60).padStart(2,"0")}`;
}
function helferAbSatz(t,min){
  const z=helferZeit(t,min);
  return z?`Ab ${z} Uhr`:`${helferVorlaufWort(min)} vor Beginn`;
}
/* Aufgaben je Termintyp – und eine mit ausdruecklicher 0 faellt raus. Der Termin (t) darf
   fehlen (Notnagel in _helferReload); dann greift nur der Typ-Filter. */
/* v662 PO 28.09.: „hier sollte es nur eine Auswahl geben, wenn wir das in der Trainer-App
   freigeben bzw. die Hilfe brauchen … auch andere Dinge könnten wir dort als Trainer eintragen.“
   Bis v661 standen je Termintyp feste Aufgaben da. Jetzt gilt nur, was der Trainer am Termin
   freigibt (termine.helfer_aufgaben: [{t, n, d?}]) – n = so viele Helfer werden gebraucht.
   Ohne Freigabe: keine Aufgabe. Texte der Vorlagen (HELFER_AUFGABEN) bleiben die Beschreibung;
   eigene Aufgaben des Trainers tragen ihren Hinweis selbst. `t` bleibt der Schlüssel in
   event_helfer.aufgabe. */
function helferTasksFuer(typ,t){
  const frei=(t&&Array.isArray(t.helfer_aufgaben))?t.helfer_aufgaben:[];
  return frei.filter(x=>x&&x.t).map(x=>{
    const v=HELFER_AUFGABEN.find(a=>a.t===x.t);
    const n=Math.max(1,Math.min(20,parseInt(x.n,10)||1));
    if(v)return Object.assign({},v,{n,extra:x.d||""});
    const text=String(x.t).replace(/^\S+\s+/,"");
    return {t:x.t,n,vor:0,kurz:()=>text,d:()=>x.d||"Das Trainerteam freut sich über Unterstützung."};
  });
}
function helferBeschreibung(a,t){ return a.d(t)+(a.extra?" "+a.extra:""); }
function _sbUid(){ try{const t=sbToken();return t?JSON.parse(atob(t.split(".")[1])).sub:null;}catch(e){return null;} }
function _helferName(){ const kids=window._elternKids||[]; const n=(kids[0]&&kids[0].kader&&kids[0].kader.name)?kids[0].kader.name:"Unsere"; return n+" Familie"; }
async function tdHelferLoad(t){
  const box=document.getElementById("td-helfer"); if(!box)return;
  if(t.datum<isoLokal()){box.innerHTML="";return;} // nur kommende Events
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=eq.${t.id}&select=id,name,aufgabe,user_id&order=created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const uid=_sbUid();
  const mine=new Set(rows.filter(x=>x.user_id===uid).map(x=>x.aufgabe));
  const list=rows.length?rows.map(x=>`<div style="display:flex;align-items:center;gap:6px;font-size:var(--s-text);padding:3px 0">
      <span style="flex:1">${esc(x.aufgabe)} · <b>${esc(x.name)}</b></span>
      ${x.user_id===uid?`<button onclick="tdHelferDel(${x.id},${t.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:var(--s-karte)">✕</button>`:""}
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Noch niemand eingetragen – mach den Anfang!</div>';
  /* Zeilen statt Chips: eine Beschreibung braucht Platz, und der Knopf muss sagen, worauf
     man sich einlaesst, BEVOR man tippt. Weisse Karte, deshalb feste helle Farbwerte. */
  const aufgaben=helferTasksFuer(t.typ,t);
  /* v662: Ohne Freigabe kein Bereich – ausser jemand hat sich schon eingetragen, dann bleibt
     die Liste, damit er sich wieder austragen kann. */
  if(!aufgaben.length&&!rows.length){box.innerHTML="";return;}
  const zahl={}; rows.forEach(x=>{zahl[x.aufgabe]=(zahl[x.aufgabe]||0)+1;});
  const buttons=aufgaben.map(a=>{const on=mine.has(a.t);const esct=a.t.replace(/'/g,"");
    const voll=!on&&(zahl[a.t]||0)>=a.n;
    if(voll)return `<div style="display:block;width:100%;margin-top:6px;padding:9px 11px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;box-sizing:border-box">
      <span style="font-size:var(--s-text);font-weight:700;color:#475569">${esc(a.t)} · voll (${a.n} von ${a.n})</span>
      <span style="display:block;font-size:var(--s-klein);color:#475569;margin-top:2px">Danke – hier ist schon genug Hilfe da.</span></div>`;
    return `<button onclick="${on?`tdHelferDelTask(${t.id},'${esct}')`:`tdHelferAdd(${t.id},'${esct}')`}" aria-pressed="${on?"true":"false"}" style="display:block;width:100%;text-align:left;margin-top:6px;padding:9px 11px;border-radius:10px;border:1.5px solid ${on?"#16a34a":"var(--rand-bedien)"};background:${on?"#f0fdf4":"#fff"};font-family:inherit;cursor:pointer">
      <span style="font-size:var(--s-text);font-weight:700;color:${on?"#15803d":"#334155"}">${on?"✓ ":""}${esc(a.t)} <span style="font-weight:600;color:#475569">· ${zahl[a.t]||0} von ${a.n}</span></span>
      <span style="display:block;font-size:var(--s-klein);font-weight:400;color:#475569;margin-top:2px;line-height:1.35">${esc(helferBeschreibung(a,t))}</span>
    </button>`;}).join("");
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">🙌 Wer hilft mit?</div>
    <div style="font-size:var(--s-klein);color:#64748b;margin-bottom:6px">Tippe eine Aufgabe an, um dich (als „${esc(_helferName())}“) einzutragen. Nochmal tippen trägt dich wieder aus.</div>
    ${t.helfer_hinweis?`<div style="font-size:var(--s-klein);color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.4">💬 ${esc(t.helfer_hinweis)}</div>`:""}
    ${list}
    <div style="margin-top:8px">${buttons}</div>
    <!-- Freifeld: was die Liste nicht kennt. Der Text wird zur Aufgabe – deshalb das feste
         ✏️ davor, damit ein getipptes „Aufbau" nie zufaellig auf einen festen Aufgaben-
         schluessel faellt und dessen Knopf als angehakt erscheinen laesst. -->
    ${aufgaben.length?`<div style="display:flex;gap:6px;margin-top:8px">
      <!-- Rahmen dunkler als bei den Aufgaben-Zeilen darueber (#e2e8f0): einen Knopf erkennt
           man an seiner Beschriftung, ein LEERES Eingabefeld nur an seinem Rand – deshalb
           gilt hier die 3:1-Regel fuer Bedienelemente. #7d8b99 = 3,49:1 auf Weiss. -->
      <input id="helfer-eigen-td" maxlength="60" placeholder="Etwas anderes – was übernimmst du?" aria-label="Eigene Aufgabe eintragen" style="flex:1;min-width:0;min-height:44px;padding:9px;border:1.5px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);box-sizing:border-box" onkeydown="if(event.key==='Enter')tdHelferAddEigen(${Number(t.id)},this)">
      <button onclick="tdHelferAddEigen(${Number(t.id)},this)" aria-label="Eigene Aufgabe eintragen" style="min-height:44px;min-width:52px;border:none;border-radius:10px;background:#15803d;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">✓</button>
    </div>`:""}
  </div>`;
}
/* Der Ersatz-Termin braucht seit v420 auch den TYP: ohne ihn fiele die Liste nach dem
   Eintragen auf die Trainings-Auswahl zurück und Live-Ticker/Betreuung verschwänden
   mitten im Spieltag. Seit v427 hängt zusätzlich die Uhrzeit im Aufbau-Text daran.
   Deshalb zuerst der offene Termin-Dialog als Quelle; der Notnagel ganz unten kennt
   beides nicht und fällt bewusst auf den allgemeinen Satz zurück, statt etwas zu erfinden. */
function _helferReload(terminId){
  const t=(ELTERN_TERMINE||[]).find(x=>Number(x.id)===Number(terminId))
    ||((window._tdTermin&&Number(window._tdTermin.id)===Number(terminId))?window._tdTermin:null)
    ||{id:terminId,datum:isoLokal()};
  /* BEIDE Darstellungen nachziehen. Seit die Aufgaben auch in der grossen Kachel stehen,
     wuerde ein Eintrag aus der Kachel sonst erst beim naechsten Laden dort erscheinen –
     man tippt, und nichts passiert. Beide steigen aus, wenn ihr Platz gerade fehlt. */
  tdHelferLoad(t);
  if(typeof elternHelferKachelLoad==="function")elternHelferKachelLoad(t);
}
async function tdHelferAdd(terminId,task){
  /* Doppel-Tap-Sperre je AUFGABE, nicht global. Global hiess: wer eine Aufgabe antippt und
     innerhalb von 1,5 s noch etwas ins Freifeld schreibt, verliert den zweiten Eintrag –
     ohne Meldung. Seit es das Freifeld gibt, ist genau das der Normalfall. */
  const schl=terminId+"|"+task;
  if(!tdHelferAdd._busy)tdHelferAdd._busy=new Set();
  if(tdHelferAdd._busy.has(schl))return;
  tdHelferAdd._busy.add(schl); setTimeout(()=>tdHelferAdd._busy.delete(schl),1500);
  try{const r=await fetch(`${SB_URL}/rest/v1/event_helfer`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({termin_id:terminId,name:_helferName(),aufgabe:task})});if(!r.ok){toast("Konnte nicht eintragen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  _helferReload(terminId);
}
/* Eigene Aufgabe: freier Text statt einer der vorgegebenen Zeilen. Kein prompt() – im
   Eltern-Bereich verbietet die Hausregel Systemdialoge (v415).
   Das Feld wird ueber das ausloesende ELEMENT gesucht, nicht ueber eine feste ID: seit die
   Aufgaben auch in der grossen Kachel stehen, koennen Kachel und Termin-Fenster gleichzeitig
   offen sein. getElementById haette dann immer das erste im Dokument geliefert – man tippt
   im Fenster und speichert den leeren Kasten der Kachel. */
async function tdHelferAddEigen(terminId,el){
  const feld=el&&(el.tagName==="INPUT"?el:el.parentElement&&el.parentElement.querySelector("input"));
  const txt=((feld&&feld.value)||"").trim().slice(0,60);
  if(!txt){ toast("Schreib kurz, was du übernimmst","err"); if(feld)feld.focus(); return; }
  const btn=(el&&el.tagName==="BUTTON")?el:null;
  if(btn)btn.disabled=true;
  await tdHelferAdd(terminId,"✏️ "+txt);
  if(btn)btn.disabled=false;
}
async function tdHelferDel(id,terminId){
  try{await fetch(`${SB_URL}/rest/v1/event_helfer?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){if(typeof toast==="function")toast("Austragen fehlgeschlagen – kein Netz?","err");}
  _helferReload(terminId);
}
async function tdHelferDelTask(terminId,task){
  try{await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=eq.${terminId}&aufgabe=eq.${encodeURIComponent(task)}&user_id=eq.${_sbUid()}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){if(typeof toast==="function")toast("Austragen fehlgeschlagen – kein Netz?","err");}
  _helferReload(terminId);
}
/* F1: Notfall-/Gesundheitskarte (Art. 9 DSGVO – Gesundheitsdaten). Eltern pflegen sie fürs
   eigene Kind; der Trainer sieht sie NUR lesend (RLS kn_trainer_read). Speichern nur mit
   ausdrücklicher Einwilligung; Widerruf durch Leeren der Karte. */
const NF_FIELDS=[
  {k:"notfallkontakt",l:"Notfallkontakt (Name)",ph:"z. B. Mama – Anna Muster"},
  {k:"notfall_tel",l:"Notfall-Telefon",ph:"z. B. 0170 …",tel:true},
  {k:"allergien",l:"Allergien",ph:"z. B. Nüsse, Insektenstiche",area:true},
  {k:"medikamente",l:"Medikamente / Bedarf",ph:"z. B. Asthmaspray in der Tasche",area:true},
  {k:"krankenversicherung",l:"Krankenversicherung",ph:"z. B. AOK"},
  {k:"blutgruppe",l:"Blutgruppe (optional)",ph:"z. B. 0+"},
  {k:"arzt",l:"Kinderarzt (optional)",ph:"Name / Telefon"},
  {k:"hinweise",l:"Weitere Hinweise",ph:"was das Trainerteam im Notfall wissen sollte",area:true}
];
async function notfallOpen(spielerId,name){
  let cur={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0]||{};}catch(e){}
  document.getElementById("nf-modal")?.remove();
  const modal=document.createElement("div"); modal.id="nf-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:480px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const field=f=>`<label style="display:block;font-size:var(--s-text);font-weight:700;margin-top:10px">${f.l}</label>`+
    (f.area?`<textarea id="nf-${f.k}" rows="2" placeholder="${f.ph}" style="width:100%;margin-top:3px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);box-sizing:border-box;resize:vertical">${esc(cur[f.k]||"")}</textarea>`
      :`<input id="nf-${f.k}" type="${f.tel?"tel":"text"}" placeholder="${f.ph}" value="${esc(cur[f.k]||"")}" style="width:100%;margin-top:3px;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);box-sizing:border-box">`);
  c.innerHTML=`
    ${mdlHead("nf-modal","🚑",`Notfallkarte · ${esc(name)}`,"","#dc2626")}
    <div style="font-size:var(--s-klein);color:#64748b;margin-bottom:6px">Diese Angaben sieht ausschließlich das <b>Trainerteam</b> – schreibgeschützt, damit im Notfall am Platz alles griffbereit ist. Du kannst sie jederzeit ändern oder leeren.</div>
    ${NF_FIELDS.map(field).join("")}
    <label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:var(--s-text);background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px">
      <input id="nf-consent" type="checkbox" ${cur.einwilligung?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:none">
      <span>Ich willige ein, dass diese <b>Gesundheitsdaten</b> zum Zweck der Notfallvorsorge gespeichert und dem Trainerteam angezeigt werden (Art. 9 DSGVO). Widerruf jederzeit durch Leeren der Karte.</span>
    </label>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="notfallSave(${spielerId})" style="flex:1;min-height:46px">Speichern</button>
      ${cur.spieler_id?`<button class="btn btn-sm btn-d" onclick="notfallClear(${spielerId})" style="min-height:46px">Karte leeren</button>`:""}
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function notfallSave(spielerId){
  const consent=document.getElementById("nf-consent")?.checked;
  if(!consent){toast("Bitte zuerst der Speicherung zustimmen","err");return;}
  const body={spieler_id:spielerId,einwilligung:true,updated_at:new Date().toISOString()};
  NF_FIELDS.forEach(f=>{const v=(document.getElementById("nf-"+f.k)?.value||"").trim();body[f.k]=v||null;});
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok){toast((typeof sbDeniedMsg==="function")?sbDeniedMsg(r):"Konnte nicht speichern","err");return;}
    document.getElementById("nf-modal")?.remove();
    toast("Notfallkarte gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function notfallClear(spielerId){
  if(!await frageJaNein({emoji:"🚑",titel:"Notfallkarte leeren?",
    text:"Alle Angaben werden gelöscht – Kontakte, Allergien, Medikamente.",
    ja:"Leeren",ton:"rot"}))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok){toast("Konnte nicht löschen","err");return;}
    document.getElementById("nf-modal")?.remove();
    toast("Notfallkarte geleert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}

/* v637: „Was muss mit?“ – feste Grundausstattung je Termin-Art. Die Schuhe richten sich nach dem
   Platz, wenn der Trainer ihn eingetragen hat (Halle / Kunstrasen / Rasen). */
function tdWasMussMit(t){
  if(!t||!["training","spiel","turnier"].includes(t.typ))return "";
  const pl=String(t.platz||"").toLowerCase();
  const schuhe=/halle/.test(pl)?"Hallenschuhe mit heller Sohle"
    :/kunst/.test(pl)?"Fußballschuhe für Kunstrasen (Multinocken)"
    :/rasen/.test(pl)?"Fußballschuhe mit Nocken"
    :"Fußballschuhe (passend zum Platz)";
  const liste=["Schienbeinschoner",schuhe,"Trinkflasche mit Wasser (mit Namen)","Wetterfeste Kleidung – bei Kälte lange Sachen drunter"];
  if(t.typ==="turnier")liste.push("Etwas Kleines zu essen für die Pausen");
  return `<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:4px">🎒 Was muss mit?</div>
    <ul style="margin:0;padding-left:20px;font-size:var(--s-text);color:#334155;line-height:1.6">${liste.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    <button onclick="document.getElementById('td-modal').remove();if(typeof elternGespraechOpen==='function')elternGespraechOpen()" style="margin-top:8px;min-height:44px;padding:0 4px;border:none;background:none;color:#1d4ed8;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer;text-decoration:underline">Frage zum Termin? Trainerteam kontaktieren</button>
  </div>`;
}
/* ── Foto- & Video-Einwilligung (3 Stufen, DSGVO) ──
   Eltern entscheiden pro Kind getrennt: app-intern / Trainingsvideos / öffentlich.
   Zweckgebunden, dokumentiert (updated_at/by serverseitig), jederzeit widerrufbar.
   Stufe 1 spiegelt via DB-Trigger auf kader.foto_stadionheft_ok (Heft/Galerie/Edge-Function).
   v649 (Charles, 27.09.): „Öffentlich“ nennt Vereinsheft, Vereins-Website und Aushänge – soziale
   Netzwerke bleiben draußen. */
const FOTO_STUFEN=[
  {k:"intern",   emo:"🖼️", t:"App-intern (geschlossene Gruppe)", d:"Team-Galerie, Sammelkarte, „Die Kabine“ und das „Adler Nest“. Sichtbar nur für eingeloggte Eltern und das Trainerteam dieses Teams.", risk:"gering"},
  {k:"video",    emo:"🎥", t:"Trainingsvideos zur Analyse",       d:"Kurze Videoclips zur Technik-/Taktik-Analyse. Ausschließlich für das Trainerteam, nicht öffentlich, nach der Saison gelöscht.", risk:"mittel"},
  {k:"public_ok",emo:"🌍", t:"Öffentlich",                        d:"Für das Adler Nest, unser Vereinsheft, und die Vereins-Website. Dort erscheint dein Kind mit Vorname, Anfangsbuchstabe des Nachnamens und Jahrgang. Weil die Website für alle sichtbar ist, fragen wir dafür gesondert. Du kannst die Freigabe jederzeit zurücknehmen.", risk:"hoch"}
];
const FOTO_CONSENT_DEFAULT="Wir bitten um deine Einwilligung, Foto- und Videoaufnahmen deines Kindes im Rahmen des Vereinssports zu verwenden. Du entscheidest für jede der drei Stufen getrennt und kannst jede Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Die Teilnahme deines Kindes am Training und an Spielen ist unabhängig von dieser Einwilligung – ein „Nein“ hat keinerlei Nachteile. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO sowie §§ 22, 23 KunstUrhG.";
async function elternFotoConsentTextLoad(){
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?select=foto_consent_text&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const t=((await r.json())[0]||{}).foto_consent_text; if(t&&t.trim())return t;}}catch(e){}
  return FOTO_CONSENT_DEFAULT;
}
async function elternFotoConsentOpen(spielerId,name){
  let cur={}; let txt=FOTO_CONSENT_DEFAULT;
  try{const r=await fetch(`${SB_URL}/rest/v1/foto_consent?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0]||{};}catch(e){}
  txt=await elternFotoConsentTextLoad();
  document.getElementById("fc-modal")?.remove();
  const modal=document.createElement("div"); modal.id="fc-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  /* PO: „Risiko gering/mittel/hoch" klang wie eine Warnung und schreckte ab. Wir benennen
     jetzt die REICHWEITE (sachlich, ohne Alarmfarben) – die Aufklärung bleibt vollständig,
     nur der Ton ist einladend statt abschreckend. */
  const riskCol={gering:"#0f766e",mittel:"#1d4ed8",hoch:"#b45309"};
  const riskTxt={gering:"nur im Team",mittel:"nur fürs Trainerteam",hoch:"auch außerhalb der App"};
  const row=s=>`<label style="display:flex;gap:10px;align-items:flex-start;padding:11px;border:1px solid #e2e8f0;border-radius:10px;margin-top:8px;cursor:pointer">
    <input id="fc-${s.k}" type="checkbox" ${cur[s.k]?"checked":""} style="margin-top:2px;width:20px;height:20px;flex:none;accent-color:#7c3aed">
    <span style="flex:1">
      <span style="font-weight:700;font-size:var(--s-text)">${s.emo} ${s.t} <span style="font-size:var(--s-klein);font-weight:700;color:${riskCol[s.risk]}">· ${riskTxt[s.risk]}</span></span>
      <span style="display:block;font-size:var(--s-klein);color:#64748b;margin-top:2px;line-height:1.5">${s.d}</span>
    </span></label>`;
  const upd=cur.updated_at?`<div style="font-size:var(--s-klein);color:var(--text3);margin-top:10px">Zuletzt aktualisiert: ${new Date(cur.updated_at).toLocaleDateString("de-DE")}${cur.updated_by?" · "+esc(cur.updated_by):""}</div>`:"";
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:500px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("fc-modal","📸",`Foto- &amp; Video-Freigabe · ${esc(name)}`,"","#0d9488")}
    <div style="font-size:var(--s-klein);color:#475569;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:11px;margin:8px 0 4px">${esc(txt)}</div>
    ${FOTO_STUFEN.map(row).join("")}
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:10px;line-height:1.5">ℹ️ Bei <b>Gruppenfotos</b> zeigen wir dein Kind öffentlich nur, wenn <u>alle</u> abgebildeten Familien der Stufe „Öffentlich“ zugestimmt haben. Freiwillig &amp; jederzeit widerrufbar.</div>
    ${upd}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="elternFotoConsentSave(${spielerId})" style="flex:1;min-height:46px">Speichern</button>
      <button class="btn btn-sm btn-d" onclick="elternFotoConsentRevoke(${spielerId})" style="min-height:46px">Alles widerrufen</button>
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function elternFotoConsentSave(spielerId){
  const body={spieler_id:spielerId};
  FOTO_STUFEN.forEach(s=>{body[s.k]=!!document.getElementById("fc-"+s.k)?.checked;});
  try{
    const r=await fetch(`${SB_URL}/rest/v1/foto_consent?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok){toast((typeof sbDeniedMsg==="function")?sbDeniedMsg(r):"Konnte nicht speichern","err");return;}
    document.getElementById("fc-modal")?.remove();
    toast("Foto-Freigabe gespeichert ✓");
    if(window._elternKids&&typeof elternChecklistLoad==="function")elternChecklistLoad(window._elternKids);
  }catch(e){toast("Netzwerkfehler","err");}
}
async function elternFotoConsentRevoke(spielerId){
  if(!await frageJaNein({emoji:"📷",titel:"Alle Freigaben widerrufen?",
    text:"Dein Kind erscheint dann auf keinem Foto und in keinem Video mehr – auch nicht im geschützten Team-Bereich.\n\nDu kannst jederzeit wieder freigeben.",
    ja:"Widerrufen",ton:"rot"}))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/foto_consent?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:spielerId,intern:false,video:false,public_ok:false})});
    if(!r.ok){toast("Konnte nicht widerrufen","err");return;}
    document.getElementById("fc-modal")?.remove();
    toast("Alle Freigaben widerrufen ✓");
    if(window._elternKids&&typeof elternChecklistLoad==="function")elternChecklistLoad(window._elternKids);
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tdRsvp(terminId,spielerId,status){
  try{
    if(status===null){
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
      if(!r.ok){toast("Konnte nicht entfernen","err");return;}
    }else{
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:spielerId,status,updated_at:new Date().toISOString()})});
      if(!r.ok){toast("Konnte nicht speichern","err");return;}
      if(status==="zugesagt"){const dd=await xpAward(spielerId,"rsvp","t"+terminId);if(dd>0)setTimeout(()=>toast(`${XP_ICON} +${dd} ${XP_LABEL} gesammelt!`),900);}
    }
  }catch(e){toast("Netzwerkfehler","err");return;}
  terminDetailOpen(terminId); // Fenster frisch zeichnen
}
async function tdNomLoad(t,kids){
  const box=document.getElementById("td-nom"); if(!box)return;
  if(t.typ!=="spiel"&&t.typ!=="turnier"){box.innerHTML="";return;}
  const zeilen=[];
  for(const k of (kids||[])){
    const nm=esc((k.kader&&k.kader.name)||"Kind");
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_nominierungsstatus`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:k.spieler_id,p_datum:t.datum})});
      if(!r.ok)continue; const s=await r.json();
      if(!s||!s.ok)continue;
      let html;
      if(s.eingeteilt){
        // Trainer hat final entschieden.
        if(s.nominiert)          html=`<b style="color:#047857">✅ nominiert – dabei!</b>`;
        else if(s.status==="verletzt") html=`<b style="color:#dc2626">🩹 verletzt – diesmal Pause</b>`;
        else                     html=`<b style="color:#b45309">😌 diesmal pausiert</b>`;
        if(!s.nominiert&&s.grund) html+=`<div style="font-size:var(--s-klein);color:#64748b">${esc(s.grund)}</div>`;
      }else{
        // Noch keine Entscheidung – nicht als "pausiert" darstellen.
        html=`<span style="color:#64748b">📋 Aufstellung wählt der Trainer noch${s.zugesagt?` · <span style="color:#059669;font-weight:700">deine Zusage liegt vor 👍</span>`:``}</span>`;
      }
      zeilen.push(`<div style="font-size:var(--s-text);padding:3px 0">${nm}: ${html}</div>`);
    }catch(e){}
  }
  box.innerHTML=zeilen.length?`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px"><div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">📋 Kader-Nominierung</div>${zeilen.join("")}<div style="font-size:var(--s-klein);color:var(--text3);margin-top:5px">Deine Zusage zeigt dem Trainer, wer verfügbar ist. Den endgültigen Kader stellt er daraus zusammen.</div></div>`:"";
}
/* v666 PO: „Ich bleibe vor Ort: die Kachel zum Anklicken braucht den Vornamen des eigenen
   Kindes nicht. Es ist ja der Zugang des Elternteils." Ein Knopf je Elternteil statt einer je
   Kind; bei mehreren Kindern gilt er für alle eigenen Kinder des Termins. */
function betreuungKnopf(terminId,kids,mine,wo){
  const ids=(kids||[]).map(k=>k.spieler_id);
  if(!ids.length)return "";
  const stay=ids.some(id=>mine[id]===true);
  return `<button type="button" id="betreuung-knopf" onclick="betreuungSetzen(${terminId},[${ids.join(",")}],${stay?"false":"true"},'${wo}')" style="width:100%;min-height:48px;margin-top:6px;padding:11px;border:1.5px solid ${stay?"#059669":"var(--rand-bedien)"};border-radius:10px;background:${stay?"#059669":"#fff"};color:${stay?"#fff":"#334155"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${stay?"✅ Ich bleibe vor Ort":"🙋 Ich bleibe vor Ort"}</button>`;
}
async function betreuungSetzen(terminId,ids,stay,wo){
  let ok=true;
  for(const id of ids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/betreuung?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:id,will_stay:stay})});
      if(!r.ok)ok=false;
    }catch(e){ok=false;}
  }
  if(!ok){toast("Konnte nicht speichern","err");return;}
  toast(stay?"Danke – du bleibst vor Ort ✓":"Notiert – du bleibst nicht vor Ort");
  if(wo==="td"&&typeof terminDetailOpen==="function")terminDetailOpen(terminId); else elternDashLoad();
}
async function tdBetreuungLoad(t,kids){
  const box=document.getElementById("td-betreuung"); if(!box)return;
  const ids=(kids||[]).map(k=>k.spieler_id);
  let mine={}, board=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/betreuung?termin_id=eq.${t.id}&spieler_id=in.(${ids.join(",")})&select=spieler_id,will_stay`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>mine[x.spieler_id]=x.will_stay);}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/betreuung_board`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:t.id})});if(r.ok)board=((await r.json())||[]).map(x=>x.name);}catch(e){}
  const toggles=betreuungKnopf(t.id,kids,mine,"td");
  const list=board.length?`<b style="color:#059669">${board.map(esc).join(", ")}</b>`:`<span style="color:#b45309;font-weight:700">noch niemand – bitte helft mit ⚠️</span>`;
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">🙋 Betreuung beim Training</div>
    <div style="font-size:var(--s-text);margin-bottom:4px">Vor Ort: ${list}</div>${toggles}
</div>`;
}
/* v646: Grillhütte im Termin (md-kasse.js: ghDienste/ghDienstHtml) – ersetzt das Büdchen. */
async function tdBuedchenLoad(t){
  const box=document.getElementById("td-buedchen"); if(!box||typeof ghDienste!=="function")return;
  /* v668: zwei Familien je Termin – die eigene Zeile zuerst, dann eine zum Übernehmen. */
  const ds=(await ghDienste(366)).filter(x=>Number(x.termin_id)===Number(t.id));
  const d=ds.find(x=>x.eigene)||ds.find(x=>x.kann_uebernehmen)||ds[0];
  if(!d){ box.innerHTML=""; return; }
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px"><b style="font-size:var(--s-text)">🔥 Grillhütte${d.eigene?": Ihr seid dran":""}</b>${ghChip(d.status)}</div>
    ${ghDienstHtml(d)}</div>`;
}
// Vom Event-Termin-Detail zur Mitbringliste auf dem Dashboard (liegt jetzt weit oben).
function tdMitbringGoto(){
  document.getElementById("td-modal")?.remove();
  const el=document.getElementById("mitbring-slot");
  if(el){ el.scrollIntoView({behavior:"smooth",block:"start"}); try{el.animate([{opacity:.35},{opacity:1}],{duration:500,iterations:2});}catch(e){} }
  else toast("Die Mitbringliste erscheint, sobald das Event näher rückt.");
}
// Alle kommenden Termine als Dialog + Kalender-Export (.ics) – gleiche Quelle wie die Liste.
let ELTERN_TERMINE=[];
// G5: Saison-Kalender-Abo – öffentliche Edge Function liefert ein live-aktualisiertes .ics.
const SEASON_ICS_HTTPS=SB_URL+"/functions/v1/season-ics";
const SEASON_ICS_WEBCAL="webcal://"+SB_URL.replace(/^https?:\/\//,"")+"/functions/v1/season-ics";
function saisonAboCopy(){
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(SEASON_ICS_HTTPS).then(()=>toast("Abo-Link kopiert ✓ – im Kalender 'Aus URL abonnieren' einfügen"),()=>toast("Kopieren nicht möglich","err"));
  else toast("Kopieren nicht möglich","err");
}
function elternTermineOpen(){
  const rows=ELTERN_TERMINE||[];
  document.getElementById("et-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="et-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Alle Termine");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10030;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const list=rows.length?rows.map((t,i)=>{
    const tm=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
    const td=new Date(t.datum+"T00:00:00");
    const twtag=["So","Mo","Di","Mi","Do","Fr","Sa"][td.getDay()];
    const tzeit=t.uhrzeit?String(t.uhrzeit).slice(0,5):"";
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f1f5f9${i===0?";background:#eff6ff;border-radius:8px":""}">
      <div style="font-size:var(--s-teil);width:28px;text-align:center">${tm.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:var(--s-text)">${esc(t.titel||t.gegner||tm.label)}${i===0?' <span style="font-size:var(--s-klein);color:#2563eb;font-weight:800">· NÄCHSTER</span>':""}</div>
        <div style="font-size:var(--s-klein);color:#64748b">${twtag} ${td.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${tzeit?" · "+tzeit+" Uhr":""}${heimLabel(t)?" · "+heimLabel(t):""}${t.ort?" · "+esc(t.ort):""}${t.platz?" · 🏟️ "+esc(t.platz):""}</div>
      </div>
      <span style="font-size:var(--s-klein);font-weight:700;color:${tm.col};background:${tm.col}18;border-radius:6px;padding:3px 7px;white-space:nowrap">${tm.label}</span>
    </div>`;}).join(""):'<div style="font-size:var(--s-text);color:var(--text3);padding:10px 0">Aktuell sind keine Termine geplant.</div>';
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:440px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("et-modal","📅","Alle Termine","Kommende Termine + Kalender-Abo","#1e3a8a")}
    <div style="max-height:55vh;overflow-y:auto">${list}</div>
    ${rows.length?`<button onclick="elternTermineIcs()" style="width:100%;margin-top:12px;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">📥 Alle in meinen Kalender (einmalig)</button>`:""}
    <a href="${SEASON_ICS_WEBCAL}" style="display:block;text-align:center;width:100%;margin-top:8px;padding:11px;border:1.5px solid #16a34a;border-radius:10px;background:#f0fdf4;color:#15803d;font-family:inherit;font-size:var(--s-text);font-weight:700;text-decoration:none;box-sizing:border-box">🔔 Termine abonnieren (aktualisiert sich automatisch)</a>
    <button onclick="saisonAboCopy()" style="width:100%;margin-top:6px;padding:9px;border:none;border-radius:10px;background:#f1f5f9;color:#475569;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">🔗 Abo-Link kopieren (für Google/Apple Kalender)</button>
    <button onclick="document.getElementById('et-modal').remove()" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;background:#f1f5f9;color:#334155;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
}
function elternTermineIcs(){
  /* v707: icsLocalStart/icsLocalPlus/icsEscape stammen aus md-spielbericht.js (Welle 2) */
  if(typeof icsLocalStart!=="function"||typeof icsEscape!=="function"){toast("Der Kalender lädt noch – bitte gleich noch einmal tippen");return;}
  const rows=ELTERN_TERMINE||[];
  if(!rows.length){toast("Keine Termine","err");return;}
  const dtStamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SV Adler Dellbrück//U9//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Adler U9 Termine"];
  rows.forEach(t=>{
    const tm=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{label:t.typ};
    const time=(t.uhrzeit?String(t.uhrzeit).slice(0,5):"")||"17:00";
    lines.push("BEGIN:VEVENT","UID:adler-"+t.id+"-"+t.datum+"@adler-u9","DTSTAMP:"+dtStamp,
      "DTSTART:"+icsLocalStart(t.datum,time),"DTEND:"+icsLocalPlus(t.datum,time,90),
      "SUMMARY:"+icsEscape((tm.label||"Termin")+": "+(t.titel||t.gegner||tm.label||"")));
    if(t.ort)lines.push("LOCATION:"+icsEscape(t.ort));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-u9-termine.ics";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Kalenderdatei erstellt ✓");
}
// Eltern-Betreuung beim Training: wer bleibt vor Ort. Alle Eltern sehen die Liste (betreuung_board).
async function elternBetreuungLoad(terminId,kids){
  const box=document.getElementById("betreuung-card"); if(!box)return;
  const ids=(kids||[]).map(k=>k.spieler_id);
  let mine={};
  try{const r=await fetch(`${SB_URL}/rest/v1/betreuung?termin_id=eq.${terminId}&spieler_id=in.(${ids.join(",")})&select=spieler_id,will_stay`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>mine[x.spieler_id]=x.will_stay);}catch(e){}
  let board=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/betreuung_board`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:terminId})});if(r.ok)board=((await r.json())||[]).map(x=>x.name);}catch(e){}
  const toggles=betreuungKnopf(terminId,kids,mine,"dash");
  const list=board.length?`<b style="color:#059669">${board.map(esc).join(", ")}</b>`:`<span style="color:#b45309;font-weight:700">noch niemand – bitte helft mit ⚠️</span>`;
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">🙋 Betreuung beim Training</div>
    <div style="font-size:var(--s-klein);color:#64748b;margin-bottom:6px">Mindestens ein Elternteil sollte während des Trainings vor Ort bleiben.</div>
    <div style="font-size:var(--s-text);margin-bottom:4px">Vor Ort: ${list}</div>
    ${toggles}
  </div>`;
}
/* Helfer-Aufgaben KOMPAKT in der grossen Termin-Kachel.
   PO: „Hilfe plane ich nicht so weit im Voraus als Eltern, sondern eher am Tag des Trainings,
   ob ich es zeitlich schaffe." Eine Entscheidung, die kurzfristig faellt, gehoert dorthin,
   wo man ohnehin zuerst hinsieht – nicht zwei Tipps tief im Termin-Fenster.
   Kompakt heisst hier: EINE Zeile je Aufgabe. Links was, rechts wann (oder wer schon).
   Die ausfuehrliche Fassung mit ganzen Saetzen bleibt im Termin-Fenster – dieselbe Sache
   in zwei Tiefen, wie bei den Rueckmelde-Knoepfen auch. */
async function elternHelferKachelLoad(t){
  const box=document.getElementById("helfer-card"); if(!box)return;
  const aufgaben=helferTasksFuer(t.typ,t);
  if(!aufgaben.length||(typeof terminVorbei==="function"&&terminVorbei(t))){box.innerHTML="";return;}
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=eq.${t.id}&select=id,name,aufgabe,user_id&order=created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const uid=_sbUid();
  const je={}; rows.forEach(x=>{(je[x.aufgabe]=je[x.aufgabe]||[]).push(x);});
  const namen=l=>l.length===1?esc(l[0].name):`${esc(l[0].name)} +${l.length-1}`;

  const zeilen=aufgaben.map(a=>{
    const wer=je[a.t]||[];
    const on=wer.some(x=>x.user_id===uid);
    const voll=!on&&wer.length>=a.n;   // v662: genug Helfer – kein weiterer Eintrag
    const esct=a.t.replace(/'/g,"");
    const zeit=a.vor?helferZeit(t,a.vor):"";
    /* Rechts steht das, was gerade zaehlt: solange niemand da ist die Uhrzeit (die
       entscheidet, ob ich es schaffe), danach der Name (der beantwortet die Frage schon). */
    const rechts=`<span style="color:${voll?"#475569":"#334155"};font-weight:700">${wer.length} von ${a.n}${voll?" · voll":""}</span>`
                 +(wer.length?` <span style="color:#15803d;font-weight:700">✓ ${namen(wer)}</span>`:zeit?` <span style="color:#475569">ab ${zeit} Uhr</span>`:"");
    if(voll)return `<div style="display:flex;align-items:center;gap:8px;width:100%;margin-top:6px;padding:10px 12px;min-height:44px;border:1.5px solid #e2e8f0;border-radius:12px;background:#f8fafc;box-sizing:border-box">
      <span style="flex:1;min-width:0;font-size:var(--s-text);font-weight:700;color:#475569">${esc(a.t.split(" ")[0])} ${esc(a.kurz(t))}</span>
      <span style="font-size:var(--s-klein);flex:none">${rechts}</span></div>`;
    return `<button onclick="${on?`tdHelferDelTask(${t.id},'${esct}')`:`tdHelferAdd(${t.id},'${esct}')`}" aria-pressed="${on?"true":"false"}" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;min-height:44px;margin-top:6px;padding:8px 11px;border-radius:10px;border:1.5px solid ${on?"#16a34a":"var(--rand-bedien)"};background:${on?"#f0fdf4":"#fff"};font-family:inherit;cursor:pointer">
      <span style="flex:1;min-width:0;font-size:var(--s-text);font-weight:700;color:${on?"#15803d":"#334155"}">${on?"✓ ":""}${esc(a.t.split(" ")[0])} ${esc(a.kurz(t))}</span>
      <span style="font-size:var(--s-klein);flex:none">${rechts}</span>
    </button>`;}).join("");

  // Freie Eintraege (✏️ …) gehoeren dazu, sonst waeren sie in der Kachel unsichtbar.
  const feste=new Set(aufgaben.map(a=>a.t));
  const frei=rows.filter(x=>!feste.has(x.aufgabe));
  const freiHtml=frei.map(x=>`<div style="display:flex;align-items:center;gap:6px;font-size:var(--s-klein);color:#475569;padding:3px 2px">
      <span style="flex:1;min-width:0">${esc(x.aufgabe)} · <b>${esc(x.name)}</b></span>
      ${x.user_id===uid?`<button onclick="tdHelferDel(${x.id},${t.id})" aria-label="Eintrag entfernen" style="border:none;background:none;color:#b91c1c;cursor:pointer;font-size:var(--s-karte);min-width:32px;min-height:32px">✕</button>`:""}
    </div>`).join("");

  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:2px">🙌 Wer hilft mit?</div>
    <div style="font-size:var(--s-klein);color:#64748b;margin-bottom:2px">Ein Tipp genügt – nochmal tippen trägt dich wieder aus.</div>
    ${t.helfer_hinweis?`<div style="font-size:var(--s-klein);color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:6px 9px;margin-top:6px;line-height:1.4">💬 ${esc(t.helfer_hinweis)}</div>`:""}
    ${zeilen}
    ${freiHtml}
    <!-- Das Eingabefeld erscheint erst auf Tippen: sonst kostet es 44 px in einer Kachel,
         die schon lang ist – fuer etwas, das die wenigsten brauchen. -->
    <button id="helfer-eigen-btn" onclick="elternHelferEigenAuf(${Number(t.id)})" style="width:100%;min-height:36px;margin-top:6px;padding:6px;border:none;background:none;color:#334155;font-family:inherit;font-size:var(--s-klein);font-weight:700;cursor:pointer;text-align:left">✏️ Etwas anderes eintragen</button>
    <div id="helfer-eigen-box" style="display:none;gap:6px;margin-top:2px">
      <input id="helfer-eigen-k" maxlength="60" placeholder="Was übernimmst du?" aria-label="Eigene Aufgabe eintragen" style="flex:1;min-width:0;min-height:44px;padding:9px;border:1.5px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);box-sizing:border-box" onkeydown="if(event.key==='Enter')tdHelferAddEigen(${Number(t.id)},this)">
      <button onclick="tdHelferAddEigen(${Number(t.id)},this)" aria-label="Eigene Aufgabe eintragen" style="min-height:44px;min-width:52px;border:none;border-radius:10px;background:#15803d;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">✓</button>
    </div>
  </div>`;
}
function elternHelferEigenAuf(){
  const b=document.getElementById("helfer-eigen-box"); if(!b)return;
  b.style.display="flex";
  document.getElementById("helfer-eigen-btn")?.remove();
  document.getElementById("helfer-eigen-k")?.focus();
}
// Eltern-Feature-Tour: beim ersten Login einmal, jederzeit über ❓ neu.
/* v637: Der Rundgang war zehn Seiten lang – beim ersten Öffnen liest das niemand; fünf Karten.
   v658 (PO 28.09.: „… vor allen Dingen in der Eltern-App … eine geführte Tour durch die
   verschiedenen Bereiche“, Kachel „Geführt mit Zeiger“): Jeder Schritt zeigt jetzt auf die
   Stelle im Dashboard, statt sie zu beschreiben. Kurze Sätze, eine Sache je Schritt; fehlt ein
   Element (kein Termin, kein Ticker), steht der Schritt als Karte in der Mitte. Motor: core.js. */
/* Nur schließen, was offen ist: elternCatClose geht einen Verlaufsschritt zurück – bei
   geschlossenem Fenster hätte das die Seite verlassen. */
const _elZu=()=>{
  const ov=document.getElementById("el-cat-overlay");
  if(ov&&ov.style.display==="block"&&typeof elternCatClose==="function"){ try{ elternCatClose(); }catch(e){} }
  document.getElementById("td-modal")?.remove();
};
const ELTERN_TOUR=[
  {emo:"🦅", t:"Willkommen bei den Adlern", vor:_elZu,
   d:"Hier läuft alles rund um dein Kind bei der U9 zusammen. Diese Tour zeigt dir, wo was ist – du startest sie jederzeit über ❓ oben neu."},
  {emo:"👍", t:"Der nächste Termin", sel:["#termin-card"], vor:_elZu,
   d:"Ganz oben steht der nächste Termin. Training gilt als zugesagt – sag nur ab, wenn dein Kind nicht kommt. Bei Spielen und Festivals tippst du auf Zu- oder Absage."},
  {emo:"📬", t:"Offene Rückmeldungen", sel:["#eltern-offen-card"],
   d:"Stehen in den nächsten 14 Tagen Antworten aus, siehst du sie hier gesammelt."},
  {emo:"🎒", t:"Alles zum Termin", sel:['[onclick^="terminDetailOpen"]'],
   d:"Tippe auf einen Termin: Wetter, Adresse mit Route, „Was muss mit?“, Fahrgemeinschaft und „Wer hilft mit?“."},
  {emo:"✅", t:"Zu erledigen", sel:["#eltern-todo-btn"],
   d:"Aufgaben für euch als Familie, zum Beispiel der Grillhütten-Dienst. Könnt ihr nicht, tippt ihr „Ersatz suchen“ – eine andere Familie kann übernehmen."},
  {emo:"📡", t:"Liveticker", sel:["#eltern-live-slot","#eltern-ticker-slot"],
   d:"Am Spieltag läuft hier der Ticker mit – auch wenn ihr nicht am Platz seid."},
  {emo:"🎮", t:"Die Kabine für dein Kind", sel:['button[onclick="kabineOpen()"]'],
   d:"Hier darf dein Kind spielen: Quiz, Missionen, Sammelalbum. Zurück geht es nur mit deinem Code."},
  {emo:"📱", t:"Kinder-App auf eigenem Gerät", sel:['button[onclick="kinderAppOpen()"]'],
   d:"Die Kabine gibt es auch als eigene App fürs Tablet oder Handy deines Kindes. Du koppelst sie mit einem Code und legst die Zeit pro Tag fest."},
  {emo:"🪪", t:"Die Karte deines Kindes", sel:['button[onclick^="elternCatOpen(\'kind-"]'],
   d:"Foto, Rolle und schöne Momente – ohne Bewertungszahlen. Hier findest du auch, was dein Kind gerade lernt."},
  {emo:"🗣️", t:"Trainerteam erreichen", sel:['button[onclick="elternCatOpen(\'kontakt\')"]'],
   d:"Fragen, Hinweise, Absprachen: So erreichst du uns direkt."},
  {emo:"🔒", t:"Datenschutz & Freigaben", sel:['button[onclick="elternCatOpen(\'datenschutz\')"]'],
   d:"Foto-Freigaben, Notfallkarte und deine Daten zum Herunterladen. Ohne dein Häkchen erscheint kein Foto deines Kindes."},
  {emo:"❓", t:"Hilfe und Schrift", sel:['button[onclick="elternTourStart()"]'],
   d:"❓ startet diese Tour neu. Daneben „A“ für größere Schrift und 🌙 für den dunklen Modus. Viel Spaß bei den Adlern!"},
];
function elternTourMaybe(){ try{if(localStorage.getItem("adler_eltern_tour"))return;}catch(e){} elternTourStart(); }
function elternTourStart(){ fuehrungStart(ELTERN_TOUR,{schluessel:"adler_eltern_tour",ende:_elZu}); }
function elternTourClose(){ if(typeof fuehrungLaeuft==="function"&&fuehrungLaeuft())fuehrungEnde(); else { try{localStorage.setItem("adler_eltern_tour","1");}catch(e){} } }
// Adler-Karte des eigenen Kindes (Eltern-Sicht): Daten kommen aus der security-definer
// RPC my_child_card (kein Direktzugriff auf geschützte Tabellen). Baut dieselbe d-Struktur
// wie adlerCardData und rendert mit adlerCardDraw.
function adlerCardDataFromChild(p){
  /* v563: Ohne Bewertung werden Stärken nicht geraten. Alle Werte stünden auf 0, und die
     Sortierung würde daraus trotzdem drei „stärkste" Merkmale machen – eine Aussage über
     ein Kind, die niemand getroffen hat. Dann lieber keine Merkmale und ein eigenes Thema.

     v593: Auf dem Kindergerät kommt die Karte aus my_child_card_kind() und bringt statt
     der Bewertungswerte nur die drei stärksten Merkmale als Schlüssel mit – dieselbe
     Karte, aber die Zahlen bleiben in der Datenbank. Beide Formen laufen hier zusammen. */
  let keys, bewertet, dim=null;
  if(p.staerken!==undefined){
    keys=(Array.isArray(p.staerken)?p.staerken:(typeof p.staerken==="string"?safeParse(p.staerken,[]):[]))
      .filter(k=>CARD_BADGES[k]).slice(0,3);
    bewertet=keys.length>0;
    dim=bewertet&&typeof feldDimVon==="function"?feldDimVon(keys[0]):null;
  }else{
    const v=typeof p.radios==="string"?safeParse(p.radios,{}):(p.radios||{});
    bewertet=Object.keys(v).length>0;
    keys=typeof staerkenAus==="function"?staerkenAus(v):[];   // v636: eine Regel für alle Geräte
    dim=keys.length&&typeof feldDimVon==="function"?feldDimVon(keys[0]):null;
  }
  const theme=p.tw?CARD_THEMES.keeper:(bewertet?(CARD_THEMES[dim]||CARD_THEMES.tech):CARD_THEMES.neu);
  const posMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer",flitzer_r:"Flitzer"};
  const pos=p.lieblingsposition||(p.tw?"Torwart":(posMap[p.snap_position]||p.prim_rolle||"Allrounder"));
  const fussMap={L:"linker Fuß",R:"rechter Fuß",B:"beidfüßig"};
  const s=p.stats||{};
  return {name:p.name,nr:p.nr,tw:!!p.tw,geb:p.geb,fotoPath:p.foto_path,pos:cardPosLabel(pos),
    fuss:fussMap[p.starker_fuss||p.strong_foot]||"",
    alter:p.geb?homeAlter(p.geb):(p.age||null), spitzname:p.spitzname||null,
    badges:bewertet?keys.map(k=>CARD_BADGES[k]):[],theme,
    counts:{tore:s.tore||0,paraden:s.paraden||0,aktionen:s.aktionen||0,spiele:s.spiele||0,trainings:s.trainings||0,quizRichtig:s.quizRichtig||0,quizBloecke:s.quizBloecke||0}};
}
async function elternCardOpen(spielerId){
  let p=null;
  /* Auf dem Kindergerät die Fassung ohne Bewertungswerte. my_child_card() lässt eine
     Kind-Sitzung ohnehin nicht durch – dort antwortete die Kachel „Meine Karte" sonst
     mit einer Fehlermeldung. */
  /* v636: Auch Eltern bekommen die Fassung ohne Bewertungswerte. my_child_card() schickte die
     16 Einzelwerte über die Leitung – nicht gezeichnet, aber in den Entwicklerwerkzeugen lesbar.
     Was ein Elternteil nicht sehen soll, gehört nicht in die Antwort (Regel aus v593). */
  const rpc="my_child_card_kind";
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/${rpc}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:spielerId})});if(r.ok)p=await r.json();}catch(e){}
  if(!p){toast("Karte konnte nicht geladen werden","err");return;}
  /* v563: Früher sperrte hier eine rote Meldung die Karte ganz ab, wenn es noch keine
     Bewertung gab. Nach dem Saisonstart – der räumt die Bewertungen ins Archiv – traf das
     jedes Kind: die Kachel „Meine Karte" versprach etwas und antwortete mit einem Fehler.
     Die Karte braucht die Bewertung aber nur für die drei Stärken. Name, Nummer, Foto und
     die Zähler stehen ohne sie; wo die Stärken hingehören, sagt die Karte, dass sie noch
     kommen. */
  const d=adlerCardDataFromChild(p); d.spielerId=spielerId; elternCardShow(d);
}
async function elternCardShow(d){
  const W=500,H=780;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  let rawPhoto=null;
  function render(){ adlerCardDraw(ctx,W,H,d,rawPhoto); canvas.toBlob(b=>{adlerCardBlob=b;},"image/png"); }
  render();
  const modal=document.createElement("div");
  modal.id="adler-card-modal";
  // z-index über der Kabine (10050), damit die Karte auch aus dem Kinder-Modus sichtbar ist.
  /* v566 – PO: „Die Sammelkarte ist nicht ganz sichtbar." `justify-content:center` mit
     `overflow:auto` schneidet oben ab, was nicht passt – der überstehende Teil liegt VOR dem
     Anfang des Scrollbereichs und ist unerreichbar. Ein Innenkasten mit `margin:auto` zentriert,
     solange Platz ist, und scrollt, sobald keiner mehr ist. */
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10060;display:flex;flex-direction:column;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal||e.target===innen)modal.remove();};
  const innen=document.createElement("div");
  innen.style.cssText="margin:auto;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%";
  modal.appendChild(innen);
  canvas.style.cssText="max-width:100%;width:300px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
  const cardWrap=cardHoloWrap(canvas); // FUT 2.0: Foil-Overlay über der Karte
  innen.appendChild(cardWrap);
  cardApplyGlow(canvas, d.counts&&d.counts.trainings); // Meilenstein-Glanz (Zähler kommen aus der RPC)
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  /* v609: In der Kabine kein „Teilen" – es öffnet das Teilen-Menü des Handys mit WhatsApp und
     den Kontakten der Eltern. */
  const inKabine=(typeof isKidsMode!=="undefined"&&isKidsMode);
  bar.innerHTML=`${inKabine?"":`<button class="btn btn-p" onclick="adlerCardShare()"><i class="ti ti-share"></i>Karte teilen</button>`}
    <button class="btn" onclick="document.getElementById('adler-card-modal').remove()">Schließen</button>`;
  innen.appendChild(bar);
  document.body.appendChild(modal);
  // Federn-Stand → Karten-Skin (in render() gebacken) + Foil-Tier + Unboxing-Feier + Skin-Galerie
  if(d.spielerId){ xpTotal(d.spielerId).then(f=>{ if(document.getElementById("adler-card-modal")){ d.federn=f; render(); cardHoloSetTier(cardWrap,cardSkinFor(f)); cardTierCelebrateMaybe(cardWrap,d.spielerId,f); modal.appendChild(cardSkinGalleryEl(f)); } }).catch(()=>{}); }
  if(d.fotoPath){ const img=await fotoLoadImage(d.fotoPath); if(img&&document.getElementById("adler-card-modal")){ rawPhoto=img; render(); } }
}

/* Gegner-Vorbericht (Prematch-Muster): letzte Duelle + Bilanz aus der eigenen Termin-
   Historie – nur Ergebnisse, keine Kindernamen. Ergebnis-Format "a:b" aus Adler-Sicht. */
/* ═══ v660: Meine Angaben ═══
   PO 28.09.: „… Name, Handy, E-Mail, Geburtsdatum, damit wir auch den Eltern als Teil der
   Mannschaft gratulieren können. Vom Kind brauchen wir das auch.“
   Die E-Mail steht im Konto und wird nur angezeigt. Die Angaben sehen das Elternteil selbst
   und das Trainerteam (RLS eltern_angaben). Den Geburtstag des Kindes schreibt die Funktion
   eltern_kind_geburtstag – der Kader bleibt für Eltern sonst nur lesbar. */
async function elternAngabenOpen(){
  document.getElementById("angaben-modal")?.remove();
  let a={};
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_angaben?select=vorname,nachname,handy,geburtstag`,{headers:sbAuthHeaders()});if(r.ok)a=((await r.json())||[])[0]||{};}catch(e){}
  const kids=window._elternKids||[];
  let mail="";
  try{const s=(typeof sbSession==="function")?sbSession():null;const pl=s&&s.access_token?JSON.parse(atob(s.access_token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))):null;mail=(pl&&pl.email)||"";}catch(e){}
  const feld="width:100%;min-height:48px;padding:10px 12px;margin:4px 0 12px;border:1px solid #94a3b8;border-radius:10px;box-sizing:border-box;font-family:inherit;font-size:var(--s-karte);background:#fff;color:#0f172a";
  const lbl="font-size:var(--s-text);color:#334155;font-weight:600";
  const m=document.createElement("div");m.id="angaben-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Meine Angaben");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const kindFelder=kids.map(k=>{const kd=k.kader||{};
    return `<label for="ang-kgeb-${k.spieler_id}" style="${lbl}">Geburtstag von ${esc(kd.name||"deinem Kind")}</label>
      <input id="ang-kgeb-${k.spieler_id}" type="date" data-alt="${esc(kd.geb||"")}" value="${esc(kd.geb||"")}" style="${feld}">`;}).join("");
  m.innerHTML=`<div style="background:#fff;color:#0f172a;border-radius:16px;padding:18px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("angaben-modal","👤","Meine Angaben","Für Rückfragen des Trainerteams und zum Gratulieren","#1e3a8a")}
    <div style="font-size:var(--s-text);color:#334155;line-height:1.5;margin-bottom:12px">Das sieht nur das Trainerteam – keine anderen Eltern, nicht die Kinder, nichts davon wird veröffentlicht. Jedes Elternteil trägt seine eigenen Angaben ein.</div>
    <div style="display:flex;gap:10px">
      <div style="flex:1;min-width:0"><label for="ang-vor" style="${lbl}">Vorname</label><input id="ang-vor" autocomplete="given-name" maxlength="60" value="${esc(a.vorname||"")}" style="${feld}"></div>
      <div style="flex:1;min-width:0"><label for="ang-nach" style="${lbl}">Nachname</label><input id="ang-nach" autocomplete="family-name" maxlength="60" value="${esc(a.nachname||"")}" style="${feld}"></div>
    </div>
    <label for="ang-handy" style="${lbl}">Handynummer</label>
    <input id="ang-handy" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" placeholder="z. B. 0171 1234567" value="${esc(a.handy||"")}" style="${feld}">
    <label for="ang-mail" style="${lbl}">E-Mail</label>
    <input id="ang-mail" type="email" value="${esc(mail)}" readonly aria-readonly="true" style="${feld};background:#f1f5f9;color:#334155">
    <label for="ang-geb" style="${lbl}">Dein Geburtstag</label>
    <input id="ang-geb" type="date" value="${esc(a.geburtstag||"")}" style="${feld}">
    ${kindFelder}
    <div id="ang-fehler" role="alert" style="font-size:var(--s-text);color:#b91c1c;min-height:18px;margin-bottom:6px"></div>
    <button id="ang-save" onclick="elternAngabenSave(this)" style="width:100%;min-height:56px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">Angaben speichern</button>
    <button onclick="document.getElementById('angaben-modal').remove()" style="width:100%;min-height:44px;margin-top:8px;border:none;background:none;color:#334155;font-family:inherit;font-size:var(--s-text);cursor:pointer">Schließen</button>
  </div>`;
  document.body.appendChild(m);
}
function _angHandyOk(h){ return !h||/^[0-9 +()\/-]{6,25}$/.test(h); }
async function elternAngabenSave(btn){
  const w=id=>(document.getElementById(id)?.value||"").trim();
  const f=document.getElementById("ang-fehler");
  const body={vorname:w("ang-vor")||null,nachname:w("ang-nach")||null,handy:w("ang-handy")||null,geburtstag:w("ang-geb")||null,updated_at:new Date().toISOString()};
  if(!_angHandyOk(body.handy)){ if(f)f.textContent="Die Handynummer bitte nur mit Ziffern, Leerzeichen, + oder /."; return; }
  if(body.geburtstag&&body.geburtstag>isoLokal()){ if(f)f.textContent="Der Geburtstag liegt in der Zukunft."; return; }
  if(btn){btn.disabled=true;btn.textContent="Speichere …";}
  const zurueck=()=>{if(btn){btn.disabled=false;btn.textContent="Angaben speichern";}};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/eltern_angaben?on_conflict=user_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    if(!r.ok){ if(f)f.textContent="Speichern hat nicht geklappt. Bitte gleich noch einmal versuchen."; return zurueck(); }
    for(const k of (window._elternKids||[])){
      const el=document.getElementById("ang-kgeb-"+k.spieler_id); if(!el)continue;
      const v=el.value; if(!v||v===el.dataset.alt)continue;
      const rr=await fetch(`${SB_URL}/rest/v1/rpc/eltern_kind_geburtstag`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_spieler_id:k.spieler_id,p_geb:v})});
      if(!rr.ok){ if(f)f.textContent=`Der Geburtstag von ${(k.kader&&k.kader.name)||"deinem Kind"} passt nicht zur U9 – bitte prüfen.`; return zurueck(); }
      if(k.kader)k.kader.geb=v;
    }
  }catch(e){ if(f)f.textContent="Keine Verbindung. Bitte gleich noch einmal versuchen."; return zurueck(); }
  document.getElementById("angaben-modal")?.remove();
  if(typeof toast==="function")toast("Angaben gespeichert ✓");
  if(typeof elternChecklistLoad==="function")elternChecklistLoad(window._elternKids||[]);
}
/* ═══ v663: Ansprechpartner im Team ═══
   PO 28.09.: „… unter ‚Mehr vom Team' der gewählte Elternbeirat stehen und Kassenwart …
   Mannschaftskasse: 40 €/Saison.“ Die Namen pflegt das Trainerteam (Eltern & Kinder →
   „Elternbeirat & Kasse“); sie stehen in team_config.eltern_team, nie im Repo. Kein Geld in
   der App: der Beitrag ist ein Hinweis, gezahlt wird wie bisher außerhalb. */
async function elternTeamAnsprechLoad(){
  const slot=document.getElementById("team-ansprech-slot"); if(!slot)return;
  let et=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=eltern_team`,{headers:sbAuthHeaders()});if(r.ok)et=(((await r.json())||[])[0]||{}).eltern_team||null;}catch(e){}
  const rollen=(et&&Array.isArray(et.rollen)?et.rollen:[]).filter(x=>x&&x.rolle&&x.name);
  const beitrag=et&&et.kasse_beitrag?String(et.kasse_beitrag):"";
  if(!rollen.length&&!beitrag){slot.innerHTML="";return;}
  /* v665 PO: „Pass die neue Kachel optisch den anderen an.“ – derselbe Aufbau wie die Zeilen
     darunter (elRow): weiß, Rand links in Teamfarbe, Zeichen links, Titel fett, Text klein. */
  const zeile=(k,v)=>`<span style="display:block;font-size:var(--s-klein);color:#64748b;margin-top:2px">${esc(k)}: <b style="color:#0f172a;font-weight:700">${esc(v)}</b></span>`;
  slot.innerHTML=`<div id="team-ansprech" style="display:flex;align-items:flex-start;gap:12px;width:100%;box-sizing:border-box;background:#fff;border:1px solid var(--rand-bedien);border-left:4px solid #1e40af;border-radius:12px;padding:13px;margin-bottom:8px">
    <span style="font-size:var(--s-teil);line-height:1">👥</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-text);font-weight:700;color:#0f172a">Ansprechpartner im Team</span>
      ${rollen.map(x=>zeile(x.rolle,x.name)).join("")}${beitrag?zeile("Mannschaftskasse",beitrag):""}</span>
  </div>`;
}
/* Pflege durch das Trainerteam (Trainer-App → Eltern & Kinder). */
async function elternTeamEditOpen(){
  document.getElementById("et-modal")?.remove();
  let et={};
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=eltern_team`,{headers:sbAuthHeaders()});if(r.ok)et=(((await r.json())||[])[0]||{}).eltern_team||{};}catch(e){}
  const rollen=Array.isArray(et.rollen)?et.rollen:[];
  const feld="width:100%;min-height:48px;padding:10px 12px;border:1px solid var(--rand-bedien);border-radius:10px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)";
  const zeile=i=>{const x=rollen[i]||{};return `<div style="display:flex;gap:8px;margin-bottom:8px">
      <input class="et-rolle" maxlength="30" placeholder="Rolle, z. B. Elternbeirat" aria-label="Rolle ${i+1}" value="${esc(x.rolle||"")}" style="${feld};flex:1">
      <input class="et-name" maxlength="60" placeholder="Name" aria-label="Name ${i+1}" value="${esc(x.name||"")}" style="${feld};flex:1.3"></div>`;};
  const m=document.createElement("div");m.id="et-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Elternbeirat & Kasse");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("et-modal","👥","Elternbeirat & Kasse","Steht bei den Eltern unter „Mehr vom Team“","#1e3a8a")}
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:10px">Nur eintragen, wer damit einverstanden ist – alle Eltern der Mannschaft sehen es.</div>
    ${[0,1,2,3].map(zeile).join("")}
    <label for="et-beitrag" style="font-size:var(--s-text);color:var(--text2)">Beitrag Mannschaftskasse</label>
    <input id="et-beitrag" maxlength="40" placeholder="z. B. 40 € pro Saison" value="${esc(et.kasse_beitrag||"")}" style="${feld};margin:4px 0 12px">
    <button id="et-save" class="btn btn-p" style="width:100%;min-height:56px" onclick="elternTeamEditSave(this)">Speichern</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('et-modal').remove()">Schließen</button>
  </div>`;
  document.body.appendChild(m);
}
function elternTeamEditLesen(){
  const r=[...document.querySelectorAll("#et-modal .et-rolle")], n=[...document.querySelectorAll("#et-modal .et-name")];
  const rollen=r.map((e,i)=>({rolle:(e.value||"").trim().slice(0,30),name:((n[i]&&n[i].value)||"").trim().slice(0,60)})).filter(x=>x.rolle&&x.name);
  const beitrag=(document.getElementById("et-beitrag")?.value||"").trim().slice(0,40);
  return (rollen.length||beitrag)?{rollen,kasse_beitrag:beitrag||null}:null;
}
async function elternTeamEditSave(btn){
  const et=elternTeamEditLesen();
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({id:1,eltern_team:et,updated_at:new Date().toISOString()})});
    if(typeof sbCheck401==="function"&&sbCheck401(r)){if(btn)btn.disabled=false;return;}
    if(!r.ok){toast("Speichern hat nicht geklappt","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Keine Verbindung","err");if(btn)btn.disabled=false;return;}
  document.getElementById("et-modal")?.remove();
  toast("Elternbeirat & Kasse gespeichert ✓");
}
async function tdVorberichtLoad(t){
  if(typeof elternHeaders!=="function"||typeof elternEsc!=="function")return;   // v707: beide aus md-matchcard.js (Welle 2)
  const box=document.getElementById("td-vorbericht"); if(!box)return;
  const gegner=(t.gegner||t.titel||"").trim(); if(!gegner)return;
  let rows=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?or=(gegner.eq.${encodeURIComponent(gegner)},titel.eq.${encodeURIComponent(gegner)})&typ=in.(spiel,turnier)&datum=lt.${t.datum}&ergebnis=not.is.null&select=datum,ergebnis,heim&order=datum.desc&limit=5`,{headers:elternHeaders()});
    if(r.ok)rows=await r.json();
  }catch(e){}
  rows=rows.filter(x=>/^\d+\s*:\s*\d+/.test(String(x.ergebnis||"")));
  if(!rows.length)return; // erstes Duell – keine Karte
  let s1=0,u=0,n1=0;
  rows.forEach(x=>{const m=String(x.ergebnis).match(/(\d+)\s*:\s*(\d+)/);const a=+m[1],b=+m[2];if(a>b)s1++;else if(a===b)u++;else n1++;});
  const letzte=rows.slice(0,3).map(x=>{
    const d=new Date(x.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
    return `<span style="display:inline-block;background:#f1f5f9;border-radius:8px;padding:3px 8px;font-size:var(--s-klein);font-weight:700;margin:2px 3px 0 0">${d}: ${elternEsc(String(x.ergebnis).trim())}</span>`;
  }).join("");
  box.innerHTML=`<div style="border:1.5px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:10px 12px;margin-top:12px">
    <div style="font-weight:800;font-size:var(--s-text);color:#1e40af">📰 Vorbericht: ${rows.length+1}. Duell mit ${elternEsc(gegner)}</div>
    <div style="font-size:var(--s-text);color:#334155;margin-top:2px">Bisher: ${s1} Sieg${s1===1?"":"e"} · ${u} Unentschieden · ${n1} Niederlage${n1===1?"":"n"} (aus Adler-Sicht)</div>
    <div style="margin-top:4px">${letzte}</div>
  </div>`;
}

/* ═══ v694 · Benachrichtigungen einschalten – oben auf der Startseite ═══════════════════════
   PO 30.09.: Der Schalter lag nur unter „Trainerteam kontaktieren“ – dort sucht ihn niemand.
   Solange auf diesem Gerät keine Benachrichtigungen an sind, steht oben eine Karte mit einem
   Knopf; ein Tipp holt die Erlaubnis und meldet an. Seit v698 steht sie ganz oben und erscheint
   auch auf dem iPhone im Browser und bei gesperrter Erlaubnis – dann mit Anleitung. */
/* v694/v698: Die Karte selbst lebt in core.js (pushKarteRender) – dieselbe steht auf der
   Trainer-Startseite. Hier nur die Namen, die die Eltern-Startseite und die MODUL_WACHE kennen. */
async function elternPushHinweis(){ if(typeof pushKarteRender==="function")return pushKarteRender("push-hinweis-slot","parent"); }
function elternPushHinweisAn(){ if(typeof pushKarteAn==="function")return pushKarteAn("push-hinweis-slot","parent"); }
function elternPushHinweisWeg(){ if(typeof pushKarteWeg==="function")pushKarteWeg("push-hinweis-slot"); }
