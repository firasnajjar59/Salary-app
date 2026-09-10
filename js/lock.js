const BIOMETRIC_LOCK_KEY='salaryApp.biometricLock.v1';
const APP_UNLOCK_SESSION_KEY='salaryApp.unlockUntil.v1';
const APP_UNLOCK_WINDOW_MS=5*60*1000;
const APP_UNLOCK_ACTIVITY_STEP_MS=60*1000;
let biometricSessionUnlocked=false;
let biometricUnlockInProgress=false;
let biometricAutoAttempted=false;

function bytesToB64url(bytes){let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64urlToBytes(value){const base64=value.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((value.length+3)%4);const binary=atob(base64);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
function randomBytes(length=32){const out=new Uint8Array(length);crypto.getRandomValues(out);return out;}
function getBiometricLockConfig(){try{return JSON.parse(localStorage.getItem(BIOMETRIC_LOCK_KEY)||'null');}catch(e){return null;}}
function biometricLockEnabled(){const c=getBiometricLockConfig();return !!(c&&c.enabled&&c.credentialId);}

function getAppUnlockUntil(){
  const n=Number(sessionStorage.getItem(APP_UNLOCK_SESSION_KEY)||0);
  return Number.isFinite(n)?n:0;
}
function appUnlockSessionActive(){return getAppUnlockUntil()>Date.now();}
function startAppUnlockSession(){
  biometricSessionUnlocked=true;
  sessionStorage.setItem(APP_UNLOCK_SESSION_KEY,String(Date.now()+APP_UNLOCK_WINDOW_MS));
}
function extendAppUnlockSession(){
  if(!biometricLockEnabled() || !appUnlockSessionActive()) return;
  const now=Date.now();
  const current=getAppUnlockUntil();
  const next=Math.min(current+APP_UNLOCK_ACTIVITY_STEP_MS,now+APP_UNLOCK_WINDOW_MS);
  sessionStorage.setItem(APP_UNLOCK_SESSION_KEY,String(next));
  biometricSessionUnlocked=true;
}
function clearAppUnlockSession(){
  sessionStorage.removeItem(APP_UNLOCK_SESSION_KEY);
  biometricSessionUnlocked=false;
}
['pointerdown','keydown','touchstart'].forEach(ev=>{
  document.addEventListener(ev,extendAppUnlockSession,{passive:true});
});

async function platformAuthSupported(){
  if(!window.PublicKeyCredential||!navigator.credentials||!window.isSecureContext) return false;
  try{
    if(typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable==='function')
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return true;
  }catch(e){return false;}
}

function updateBiometricLockUi(message=''){
  const status=$('biometricLockStatus'),enabled=biometricLockEnabled();
  if(status) status.textContent=message||(enabled?'הנעילה פעילה במכשיר הזה.':'הנעילה אינה פעילה.');
  if($('enableBiometricLock')) $('enableBiometricLock').disabled=enabled;
  if($('disableBiometricLock')) $('disableBiometricLock').disabled=!enabled;
}

async function registerBiometricLock(){
  if(!(await platformAuthSupported())){
    updateBiometricLockUi('המכשיר או הדפדפן אינם תומכים באימות מכשיר דרך WebAuthn.');
    alert('לא נמצאה תמיכה מתאימה בנעילה ביומטרית בדפדפן הזה.');
    return;
  }
  updateBiometricLockUi('ממתין לאימות המכשיר...');
  try{
    const cred=await navigator.credentials.create({publicKey:{
      challenge:randomBytes(32),
      rp:{name:'Salary App'},
      user:{id:randomBytes(32),name:'salary-app-local',displayName:'Salary App'},
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},
      timeout:60000,attestation:'none'
    }});
    if(!cred) throw new Error('No credential');
    localStorage.setItem(BIOMETRIC_LOCK_KEY,JSON.stringify({
      enabled:true,
      credentialId:bytesToB64url(new Uint8Array(cred.rawId)),
      createdAt:new Date().toISOString()
    }));
    startAppUnlockSession();
    updateBiometricLockUi('הנעילה הביומטרית הופעלה בהצלחה.');
  }catch(e){
    console.warn('Biometric registration failed',e);
    updateBiometricLockUi('ההפעלה לא הושלמה. אפשר לנסות שוב.');
  }
}

function setLockScreenMessage(text,buttonText='פתח באמצעות אימות המכשיר'){
  const status=$('lockScreenStatus')||$('appLockStatus');
  if(status) status.textContent=text||'';
  const btn=$('unlockAppBtn');
  if(btn) btn.textContent=buttonText;
}

function hideAppLock(){
  const overlay=$('appLockOverlay');
  if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}
}

function showAppLockIfNeeded({autoAttempt=true}={}){
  if(!biometricLockEnabled()){hideAppLock();return;}
  if(appUnlockSessionActive()){biometricSessionUnlocked=true;hideAppLock();return;}
  biometricSessionUnlocked=false;
  const overlay=$('appLockOverlay');
  if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}
  setLockScreenMessage('האפליקציה נעולה. מנסה לפתוח את אימות המכשיר…','פתח באמצעות אימות המכשיר');
  if(autoAttempt && !biometricAutoAttempted){
    biometricAutoAttempted=true;
    setTimeout(()=>authenticateBiometricUnlock(true),300);
  }
}

async function authenticateBiometricUnlock(isAutomatic=false){
  if(biometricUnlockInProgress) return false;
  if(appUnlockSessionActive()){startAppUnlockSession();hideAppLock();return true;}
  const config=getBiometricLockConfig();
  if(!config?.credentialId) return false;
  biometricUnlockInProgress=true;
  setLockScreenMessage('ממתין לטביעת אצבע, זיהוי פנים או קוד המכשיר…',isAutomatic?'פתח באמצעות אימות המכשיר':'ממתין לאימות…');
  try{
    const assertion=await navigator.credentials.get({publicKey:{
      challenge:randomBytes(32),
      allowCredentials:[{type:'public-key',id:b64urlToBytes(config.credentialId),transports:['internal']}],
      userVerification:'required',
      timeout:60000
    }});
    if(!assertion) throw new Error('No assertion');
    startAppUnlockSession();
    hideAppLock();
    setLockScreenMessage('');
    return true;
  }catch(e){
    console.warn('Biometric unlock failed',e);
    const browserBlocked = isAutomatic && (e?.name==='NotAllowedError' || e?.name==='SecurityError');
    if(browserBlocked){
      setLockScreenMessage('הדפדפן דורש נגיעה לפני פתיחת אימות המכשיר. לחץ על הכפתור לפתיחה.','פתח באמצעות אימות המכשיר');
    }else{
      setLockScreenMessage('האימות לא הושלם. אפשר לנסות שוב.','נסה שוב');
    }
    return false;
  }finally{
    biometricUnlockInProgress=false;
  }
}

function disableBiometricLock(){
  if(!biometricLockEnabled())return;
  if(!confirm('לבטל את נעילת האפליקציה במכשיר הזה?'))return;
  localStorage.removeItem(BIOMETRIC_LOCK_KEY);
  clearAppUnlockSession();
  hideAppLock();
  updateBiometricLockUi('הנעילה בוטלה במכשיר הזה.');
}

async function initBiometricLock(){
  const supported=await platformAuthSupported();
  if(!supported&&!biometricLockEnabled()) updateBiometricLockUi('אימות ביומטרי אינו זמין בדפדפן או במכשיר הזה.');
  else updateBiometricLockUi();
  if(appUnlockSessionActive()) biometricSessionUnlocked=true;
  showAppLockIfNeeded({autoAttempt:true});
}

/* נעילה חוזרת רק לאחר שפג חלון הפתיחה. פעילות משתמש מאריכה אותו. */
setInterval(()=>{
  if(!biometricLockEnabled()) return;
  if(appUnlockSessionActive()) return;
  const overlay=$('appLockOverlay');
  if(overlay?.classList.contains('hidden')){
    biometricAutoAttempted=false;
    showAppLockIfNeeded({autoAttempt:true});
  }
},15000);

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible') return;
  if(appUnlockSessionActive()){
    biometricSessionUnlocked=true;
    hideAppLock();
  }else if(biometricLockEnabled()){
    biometricAutoAttempted=false;
    showAppLockIfNeeded({autoAttempt:true});
  }
});

