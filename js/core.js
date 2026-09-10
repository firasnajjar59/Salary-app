const $ = id => document.getElementById(id);
const KEY_SHIFTS='salaryApp.shifts.v1', KEY_SETTINGS='salaryApp.settings.v1', KEY_PAYSLIPS='salaryApp.payslips.v1';
const KEY_DD_TABLES='salaryApp.ddTables.v1';
const KEY_DD_SERVER_VERSION='salaryApp.ddServerVersion.v1';
const DD_SERVER_URL='./dd.json';
const APP_VERSION=1051;
const APP_VERSION_LABEL='1.5';
if($('aboutVersionLabel')) $('aboutVersionLabel').textContent=APP_VERSION_LABEL;
function formatDateInputValue(value){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  return m?`${m[3]}/${m[2]}/${m[1]}`:'';
}
function refreshDateInputDisplays(){
  document.querySelectorAll('.ios-date-shell').forEach(shell=>{
    const input=shell.querySelector('input[type="date"]');
    const display=shell.querySelector('.ios-date-display');
    if(!input||!display) return;
    display.textContent=formatDateInputValue(input.value)||'בחר תאריך';
    display.classList.toggle('placeholder',!input.value);
  });
}
function enhanceDateInputs(){
  document.querySelectorAll('input[type="date"]').forEach(input=>{
    if(input.closest('.ios-date-shell')) return;
    input.setAttribute('lang','he-IL');
    const shell=document.createElement('span');
    shell.className='ios-date-shell';
    input.parentNode.insertBefore(shell,input);
    shell.appendChild(input);
    const display=document.createElement('span');
    display.className='ios-date-display';
    display.setAttribute('aria-hidden','true');
    shell.appendChild(display);
    input.addEventListener('input',refreshDateInputDisplays);
    input.addEventListener('change',refreshDateInputDisplays);
  });
  refreshDateInputDisplays();
}
document.addEventListener('DOMContentLoaded',enhanceDateInputs);

let settingsDirty=false;
function markSettingsDirty(){
  settingsDirty=true;
  $('floatingSaveSettings')?.classList.remove('hidden');
}
function clearSettingsDirty(){
  settingsDirty=false;
  $('floatingSaveSettings')?.classList.add('hidden');
}
function saveAllGeneralSettings(){
  saveSettings();
  clearSettingsDirty();
  renderShifts();
  renderSummary();
  renderTodayDashboard();
}
function bindSettingsDirtyTracking(){
  const root=$('settings'); if(!root || root.dataset.dirtyBound==='1') return;
  root.dataset.dirtyBound='1';
  root.addEventListener('input',e=>{
    if(e.target.matches('[data-line-op-planned],[data-line-op-tolerance],[data-line-point],#baseRate,#travelPerDay,#travelMonthlyCap,#perDiemPerDay,#nightPct,#holidayPct,#nightStart,#nightEnd,#regularDailyHours,#ot125Hours,#halfLoopAmount,#fullLoopAmount,#nightLine2Amount,#nightLine3Amount,#nightLineOver3Amount,#tax10UpTo,#tax14UpTo,#tax20UpTo,#tax31UpTo,#tax35UpTo,#tax47UpTo,#niReducedUpTo,#niMaxIncome,#niLowPct,#niHighPct,#healthLowPct,#healthHighPct,#creditPoints,#creditPointValue,#pensionPct,#otherDeductPct')){
      markSettingsDirty();
    }
  });
  root.addEventListener('change',e=>{
    if(e.target.matches('[data-line-op-planned],[data-line-op-tolerance],[data-line-point],#baseRate,#travelPerDay,#travelMonthlyCap,#perDiemPerDay,#nightPct,#holidayPct,#nightStart,#nightEnd,#regularDailyHours,#ot125Hours,#halfLoopAmount,#fullLoopAmount,#nightLine2Amount,#nightLine3Amount,#nightLineOver3Amount,#tax10UpTo,#tax14UpTo,#tax20UpTo,#tax31UpTo,#tax35UpTo,#tax47UpTo,#niReducedUpTo,#niMaxIncome,#niLowPct,#niHighPct,#healthLowPct,#healthHighPct,#creditPoints,#creditPointValue,#pensionPct,#otherDeductPct')){
      markSettingsDirty();
    }
  });
}
document.addEventListener('DOMContentLoaded',bindSettingsDirtyTracking);


