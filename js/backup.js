function buildBackupPayload(){
  let shiftsData=[], settingsData={}, payslipsData={}, ddTablesData={};
  try{ shiftsData=JSON.parse(localStorage.getItem(KEY_SHIFTS)||'[]'); }catch(e){ shiftsData=[]; }
  try{ settingsData=JSON.parse(localStorage.getItem(KEY_SETTINGS)||'{}'); }catch(e){ settingsData={}; }
  try{ payslipsData=JSON.parse(localStorage.getItem(KEY_PAYSLIPS)||'{}'); }catch(e){ payslipsData={}; }
  try{ ddTablesData=JSON.parse(localStorage.getItem(KEY_DD_TABLES)||'{}'); }catch(e){ ddTablesData={}; }

  return {
    app: 'salary-work-hours',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      shifts: shiftsData,
      settings: settingsData,
      payslips: payslipsData,
      ddTables: ddTablesData
    }
  };
}

function getDriveBackupMeta(){
  try{
    const v=JSON.parse(localStorage.getItem(KEY_DRIVE_BACKUP)||'{}');
    return v && typeof v==='object' ? v : {};
  }catch(e){ return {}; }
}

function saveDriveBackupMeta(patch){
  const current=getDriveBackupMeta();
  const next={...current,...patch};
  localStorage.setItem(KEY_DRIVE_BACKUP,JSON.stringify(next));
  renderCloudBackupStatus();
  return next;
}

function formatBackupDate(value){
  if(!value) return 'אין עדיין גיבוי';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return 'אין עדיין גיבוי';
  try{return new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(d);}
  catch(e){return d.toLocaleString('he-IL');}
}

function renderCloudBackupStatus(extra=''){
  const el=$('cloudBackupStatus');
  if(!el) return;
  const meta=getDriveBackupMeta();
  const state=meta.connected ? 'Google Drive מחובר' : 'Google Drive עדיין לא חובר';
  const last=`גיבוי אחרון: ${formatBackupDate(meta.lastBackupAt)}`;
  el.textContent=extra ? `${state} · ${last} · ${extra}` : `${state} · ${last}`;
}

function driveTokenValid(){
  return !!driveAccessToken && Date.now() < driveTokenExpiresAt-60000;
}

function initDriveTokenClient(){
  if(driveTokenClient || !window.google?.accounts?.oauth2) return !!driveTokenClient;
  driveTokenClient=google.accounts.oauth2.initTokenClient({
    client_id:GOOGLE_CLIENT_ID,
    scope:DRIVE_SCOPE,
    callback:async response=>{
      if(!response || response.error || !response.access_token){
        const message=response?.error ? `שגיאת הרשאה: ${response.error}` : 'לא התקבלה הרשאה מ-Google.';
        renderCloudBackupStatus(message);
        drivePendingAction=null;
        return;
      }
      driveAccessToken=response.access_token;
      driveTokenExpiresAt=Date.now()+(Number(response.expires_in||3600)*1000);
      const action=drivePendingAction;
      drivePendingAction=null;
      saveDriveBackupMeta({connected:true});
      try{
        if(action==='backup' || action==='autoBackup' || action==='connect') await backupToDrive(action==='autoBackup');
        else if(action==='restore') await restoreFromDrive();
        else renderCloudBackupStatus('החיבור הצליח');
      }catch(e){
        console.error(e);
        renderCloudBackupStatus(e?.message||'פעולת Google Drive נכשלה');
        if(action!=='autoBackup') alert(e?.message||'פעולת Google Drive נכשלה.');
      }
    },
    error_callback:error=>{
      console.error('Google OAuth error',error);
      drivePendingAction=null;
      renderCloudBackupStatus('לא ניתן לפתוח את הרשאת Google כרגע');
    }
  });
  return true;
}

function requestDriveAccess(action,interactive=true){
  if(driveTokenValid()){
    if(action==='backup' || action==='autoBackup' || action==='connect') return backupToDrive(action==='autoBackup');
    if(action==='restore') return restoreFromDrive();
    return;
  }
  if(!initDriveTokenClient()){
    renderCloudBackupStatus('שירות ההתחברות של Google עדיין נטען');
    if(interactive) alert('שירות ההתחברות של Google עדיין נטען. נסה שוב בעוד כמה שניות.');
    return;
  }
  drivePendingAction=action;
  const meta=getDriveBackupMeta();
  try{
    driveTokenClient.requestAccessToken({prompt:(interactive && !meta.connected)?'consent':''});
  }catch(e){
    drivePendingAction=null;
    console.error(e);
    renderCloudBackupStatus('לא ניתן לבקש הרשאת Google כרגע');
  }
}

async function driveFetch(url,options={}){
  if(!driveTokenValid()) throw new Error('פג תוקף החיבור ל-Google Drive. לחץ שוב על הפעולה כדי להתחבר מחדש.');
  const headers=new Headers(options.headers||{});
  headers.set('Authorization',`Bearer ${driveAccessToken}`);
  const response=await fetch(url,{...options,headers});
  if(response.status===401){
    driveAccessToken=''; driveTokenExpiresAt=0;
    throw new Error('פג תוקף החיבור ל-Google Drive. לחץ שוב כדי להתחבר מחדש.');
  }
  if(!response.ok){
    let detail='';
    try{detail=(await response.json())?.error?.message||'';}catch(e){}
    throw new Error(detail ? `Google Drive: ${detail}` : `Google Drive החזיר שגיאה ${response.status}.`);
  }
  return response;
}

async function findDriveBackup(){
  const params=new URLSearchParams({
    spaces:'appDataFolder',
    q:`name='${DRIVE_BACKUP_FILE.replaceAll("'","\\'")}' and trashed=false`,
    fields:'files(id,name,modifiedTime,size)',
    orderBy:'modifiedTime desc',
    pageSize:'10'
  });
  const r=await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  const data=await r.json();
  return Array.isArray(data.files) && data.files.length ? data.files[0] : null;
}

async function createDriveBackupFile(){
  const r=await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,modifiedTime',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:DRIVE_BACKUP_FILE,parents:['appDataFolder'],mimeType:'application/json'})
  });
  return r.json();
}

async function uploadDriveBackup(fileId,payload){
  const r=await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json;charset=utf-8'},
    body:JSON.stringify(payload)
  });
  return r.json();
}

async function backupToDrive(silent=false){
  if(!silent) renderCloudBackupStatus('מגבה...');
  const payload=buildBackupPayload();
  let file=await findDriveBackup();
  if(!file) file=await createDriveBackupFile();
  const uploaded=await uploadDriveBackup(file.id,payload);
  saveDriveBackupMeta({connected:true,lastBackupAt:new Date().toISOString()});
  renderCloudBackupStatus('הגיבוי הושלם');
  return uploaded;
}

function applyBackupPayload(payload){
  const cleanShifts=dedupeShifts(payload.data.shifts);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(cleanShifts));
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(payload.data.settings));
  localStorage.setItem(KEY_PAYSLIPS,JSON.stringify(payload.data.payslips));
  if(payload.data.ddTables!==undefined) localStorage.setItem(KEY_DD_TABLES,JSON.stringify(normalizeDdTables(payload.data.ddTables)));
}

async function restoreFromDrive(){
  renderCloudBackupStatus('מחפש גיבוי בענן...');
  const file=await findDriveBackup();
  if(!file){
    renderCloudBackupStatus('לא נמצא גיבוי בענן');
    alert('לא נמצא עדיין גיבוי של Salary App ב-Google Drive.');
    return;
  }
  const r=await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`);
  const payload=await r.json();
  if(!validateBackupPayload(payload)) throw new Error('קובץ הגיבוי בענן אינו תקין או אינו שייך לאפליקציה הזו.');
  const when=file.modifiedTime ? `\nגיבוי מתאריך: ${formatBackupDate(file.modifiedTime)}` : '';
  if(!confirm(`השחזור מהענן יחליף את הנתונים הקיימים באפליקציה.${when}\n\nלהמשיך?`)){
    renderCloudBackupStatus('השחזור בוטל');
    return;
  }
  applyBackupPayload(payload);
  saveDriveBackupMeta({connected:true,lastCloudRestoreAt:new Date().toISOString()});
  alert('השחזור מהענן הושלם בהצלחה. האפליקציה תיטען מחדש.');
  location.reload();
}

function maybeRunDailyCloudBackup(){
  const meta=getDriveBackupMeta();
  if(!meta.connected) return;
  const last=Date.parse(meta.lastBackupAt||'')||0;
  if(Date.now()-last < 24*60*60*1000) return;
  requestDriveAccess('autoBackup',false);
}

function setupGoogleDriveBackup(){
  renderCloudBackupStatus();
  if($('connectDriveBtn')) $('connectDriveBtn').onclick=()=>requestDriveAccess('connect',true);
  if($('cloudBackupBtn')) $('cloudBackupBtn').onclick=()=>requestDriveAccess('backup',true);
  if($('cloudRestoreBtn')) $('cloudRestoreBtn').onclick=()=>requestDriveAccess('restore',true);
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(initDriveTokenClient() || tries>=20){
      clearInterval(timer);
      setTimeout(maybeRunDailyCloudBackup,500);
    }
  },250);
}

function downloadBackupJson(){
  const payload=buildBackupPayload();
  const json=JSON.stringify(payload,null,2);
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const now=new Date();
  const stamp=[
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,'0'),
    String(now.getDate()).padStart(2,'0')
  ].join('-');
  a.href=url;
  a.download=`salary-app-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function validateBackupPayload(payload){
  if(!payload || typeof payload!=='object') return false;
  if(payload.app!=='salary-work-hours') return false;
  if(Number(payload.backupVersion)!==1) return false;
  if(!payload.data || typeof payload.data!=='object') return false;
  if(!Array.isArray(payload.data.shifts)) return false;
  if(!payload.data.settings || typeof payload.data.settings!=='object' || Array.isArray(payload.data.settings)) return false;
  if(!payload.data.payslips || typeof payload.data.payslips!=='object' || Array.isArray(payload.data.payslips)) return false;
  if(payload.data.ddTables!==undefined && (!payload.data.ddTables || typeof payload.data.ddTables!=='object' || Array.isArray(payload.data.ddTables))) return false;
  return true;
}

async function restoreBackupFromFile(file){
  try{
    const text=await file.text();
    const payload=JSON.parse(text);

    if(!validateBackupPayload(payload)){
      alert('קובץ הגיבוי אינו תקין או שאינו שייך לאפליקציה הזו.');
      return;
    }

    if(!confirm('השחזור יחליף את הנתונים הקיימים באפליקציה בנתונים שבקובץ הגיבוי. להמשיך?')){
      return;
    }

    applyBackupPayload(payload);

    alert('השחזור הושלם בהצלחה. האפליקציה תיטען מחדש.');
    location.reload();
  }catch(e){
    alert('לא ניתן לקרוא את קובץ הגיבוי. ודא שזה קובץ JSON תקין.');
  }
}

$('backupBtn').onclick=downloadBackupJson;
$('restoreBtn').onclick=()=>$('restoreFile').click();
$('restoreFile').addEventListener('change',()=>{
  const file=$('restoreFile').files && $('restoreFile').files[0];
  if(file) restoreBackupFromFile(file);
  $('restoreFile').value='';
});

setupGoogleDriveBackup();

$('clearBtn').onclick=()=>{
  if(confirm('למחוק את כל המשמרות וההגדרות?')){
    localStorage.removeItem(KEY_SHIFTS); localStorage.removeItem(KEY_SETTINGS); location.reload();
  }
};

function dayNameHe(dateStr){
  try{
    return new Intl.DateTimeFormat('he-IL',{weekday:'long'}).format(new Date(dateStr+'T12:00:00'));
  }catch(e){
    return '';
  }
}

function formatDateHe(dateStr){
  const [y,m,d]=(dateStr||'').split('-');
  return y&&m&&d ? `${d}/${m}/${y}` : dateStr;
}

function escapeHtml(v){
  return String(v??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function specialDescription(sh){
  const parts=[];
  if(sh.extraLoopType==='half') parts.push('חצי סיבוב');
  if(sh.extraLoopType==='full') parts.push('סיבוב');
  if(sh.nightLineType==='to2') parts.push('קווי לילה עד 02:00');
  if(sh.nightLineType==='to3') parts.push('קווי לילה עד 03:00');
  if(sh.nightLineType==='over3') parts.push('קווי לילה מעל 03:00');
  return parts.join(', ');
}

