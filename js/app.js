const ACTIVE_TAB_SESSION_KEY='salaryApp.activeTab.v1';
const APP_TABS=['mainDashboard','todayDashboard','shifts','summary','payslip','settings','shiftDetailsPage','dayDetailsPage'];

function showAppTab(tabId,{remember=true,historyMode='push',shiftId=null,dayDate=null}={}){
  if(!APP_TABS.includes(tabId)) return;

  if(historyMode==='push'){
    const nextState={salaryAppTab:tabId};
    if(shiftId) nextState.shiftId=shiftId;
    if(dayDate) nextState.dayDate=dayDate;
    const sameTab=history.state?.salaryAppTab===tabId;
    const sameShift=!shiftId || history.state?.shiftId===shiftId;
    if(!(sameTab&&sameShift)){
      try{ history.pushState(nextState,'',location.href); }catch(e){}
    }
  }

  document.querySelectorAll('.tab').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.tab===tabId);
  });
  APP_TABS.forEach(id=>$(id)?.classList.add('hidden'));
  $(tabId)?.classList.remove('hidden');

  if(tabId==='todayDashboard' || tabId==='mainDashboard') renderTodayDashboard();
  if(tabId==='summary') renderSummary();
  if(tabId==='payslip') renderPayslipComparison();

  if(remember && tabId!=='shiftDetailsPage' && tabId!=='dayDetailsPage'){
    try{ sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY,tabId); }catch(e){}
  }
}

function setupPwaBackNavigation(){
  const current=(sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY)||'mainDashboard');
  try{
    history.replaceState({salaryAppTab:current},'',location.href);
  }catch(e){}
}
window.addEventListener('popstate',e=>{
  const tab=e.state?.salaryAppTab;
  if(tab==='shiftDetailsPage' && e.state?.shiftId){
    openShiftDetails(e.state.shiftId,{historyMode:'pop'});
    return;
  }
  if(tab==='dayDetailsPage' && e.state?.dayDate){
    openDayDetails(e.state.dayDate,{historyMode:'pop'});
    return;
  }
  if(tab && APP_TABS.includes(tab)) showAppTab(tab,{remember:true,historyMode:'pop'});
});
setTimeout(setupPwaBackNavigation,0);

document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{
  showAppTab(btn.dataset.tab);
});

loadSettings();
const today=new Date();
const currentDate=localDateIso(today);
const currentMonth=currentDate.slice(0,7);
dashboardCalendarMonth=currentMonth;
$('date').value=currentDate;
$('monthFilter').value=currentMonth;

const availableShiftMonths=[...new Set(shifts.map(s=>s.date.slice(0,7)))].sort().reverse();
$('shiftMonthFilter').value=availableShiftMonths.includes(currentMonth)
  ? currentMonth
  : (availableShiftMonths[0] || currentMonth);

$('shiftDdSearch').addEventListener('input',renderShifts);
$('shiftMonthFilter').addEventListener('change',renderShifts);
$('shiftSpecialFilter').addEventListener('change',renderShifts);
$('payslipMonth').value=currentMonth;
$('payslipMonth').addEventListener('change',renderPayslipComparison);
$('openPayslipFromSummary')?.addEventListener('click',()=>{
  const m=$('monthFilter')?.value||currentMonth;
  if($('payslipMonth')) $('payslipMonth').value=m;
  renderPayslipComparison();
  showAppTab('payslip');
});
setTimeout(openDeepLinkFromUrl,0);
$('savePayslip').addEventListener('click',savePayslipData);

renderShifts(); renderSummary(); renderPayslipComparison(); renderTodayDashboard();

/*
  ניווט התחלתי:
  - ברענון נשארים בעמוד שהיה פתוח באותה הפעלה.
  - בפתיחה חדשה: אם יש משמרת היום -> "היום", אחרת -> "ראשי".
*/
let initialTab='';
try{ initialTab=sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY)||''; }catch(e){}
if(!APP_TABS.includes(initialTab)){
  const hasShiftToday=shifts.some(sh=>sh.date===currentDate);
  initialTab=hasShiftToday?'todayDashboard':'mainDashboard';
}
showAppTab(initialTab,{remember:false});

initBiometricLock();


let pendingServiceWorker=null;
let remoteVersion=null;
let reloadingForUpdate=false;

function showUpdateBanner(worker,version=null,displayVersion=null){
  if(worker) pendingServiceWorker=worker;
  if(version) remoteVersion=version;
  const label=displayVersion || (version ? String(version) : null);
  const title=$('updateBannerTitle');
  if(title) title.textContent=label ? `גרסה ${label} זמינה` : 'גרסה חדשה זמינה';
  $('updateBanner').classList.remove('hidden');
}
function hideUpdateBanner(){ $('updateBanner').classList.add('hidden'); }

async function fetchRemoteVersionInfo(){
  try{
    const r=await fetch(`${VERSION_URL}?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) return null;
    const info=await r.json();
    const version=Number(info.version||0);
    if(!Number.isFinite(version)) return null;
    return {version,displayVersion:String(info.displayVersion||version)};
  }catch(e){ return null; }
}
async function checkRemoteVersion(){
  const info=await fetchRemoteVersionInfo();
  if(info && info.version>APP_VERSION) showUpdateBanner(null,info.version,info.displayVersion);
  return info;
}
async function handleWaitingWorker(worker){
  if(!worker) return;
  const info=await fetchRemoteVersionInfo();
  if(info && info.version>APP_VERSION){
    showUpdateBanner(worker,info.version,info.displayVersion);
    return;
  }
  // A waiting worker for the same/older app version is not a user-visible update.
  // Activate it silently so the same update banner does not reappear on every launch.
  try{ worker.postMessage({type:'SKIP_WAITING'}); }catch(e){}
}

$('applyUpdate').onclick=async()=>{
  const btn=$('applyUpdate');
  btn.disabled=true;
  btn.textContent='מעדכן...';
  try{
    const reg=await navigator.serviceWorker?.getRegistration();
    if(reg){
      await reg.update().catch(()=>{});
      const waiting=reg.waiting || pendingServiceWorker;
      if(waiting){
        waiting.postMessage({type:'SKIP_WAITING'});
        return;
      }
    }
    // Cache-busting reload fallback when no waiting worker is available.
    const u=new URL(location.href);
    u.searchParams.set('appUpdate',String(Date.now()));
    location.replace(u.toString());
  }catch(e){
    location.reload();
  }
};
$('dismissUpdate').onclick=hideUpdateBanner;

if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloadingForUpdate) return;
    reloadingForUpdate=true;
    const u=new URL(location.href);
    u.searchParams.set('updated',String(Date.now()));
    location.replace(u.toString());
  });

  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
    if(reg.waiting) handleWaitingWorker(reg.waiting);
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker) return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller){
          handleWaitingWorker(worker);
        }
      });
    });
    reg.update().catch(()=>{});
  }).catch(()=>{});
}

checkRemoteVersion();
setInterval(checkRemoteVersion,15*60*1000);
checkDdServerUpdate();
setInterval(checkDdServerUpdate,6*60*60*1000);
