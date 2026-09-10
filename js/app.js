const $ = id => document.getElementById(id);
const KEY_SHIFTS='salaryApp.shifts.v1', KEY_SETTINGS='salaryApp.settings.v1', KEY_PAYSLIPS='salaryApp.payslips.v1';
const KEY_DD_TABLES='salaryApp.ddTables.v1';
const KEY_DD_SERVER_VERSION='salaryApp.ddServerVersion.v1';
const DD_SERVER_URL='./dd.json';
const APP_VERSION=105;
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


const CALENDAR_PREFS_KEY='salaryApp.calendarPrefs.v1';
function getCalendarPrefs(){
  try{
    return Object.assign(
      {jewish:true,muslim:true,christian:true,national:true,special:true},
      JSON.parse(localStorage.getItem(CALENDAR_PREFS_KEY)||'{}')
    );
  }catch(_){
    return {jewish:true,muslim:true,christian:true,national:true,special:true};
  }
}
function setCalendarPref(key,value){
  const p=getCalendarPrefs(); p[key]=!!value;
  localStorage.setItem(CALENDAR_PREFS_KEY,JSON.stringify(p));
  applyCalendarPrefsUi();
  renderDashboardCalendar();
  if(currentDayDetailsDate) openDayDetails(currentDayDetailsDate,{historyMode:'pop'});
}
function applyCalendarPrefsUi(){
  const p=getCalendarPrefs();
  document.querySelectorAll('[data-calendar-pref]').forEach(el=>{
    el.checked=!!p[el.dataset.calendarPref];
  });
}
document.addEventListener('DOMContentLoaded',applyCalendarPrefsUi);

function datePartsInCalendar(date,calendar){
  try{
    const f=new Intl.DateTimeFormat('en-US-u-ca-'+calendar,{day:'numeric',month:'numeric',year:'numeric'});
    const parts=f.formatToParts(new Date(date+'T12:00:00'));
    const out={};
    for(const x of parts) if(x.type==='day'||x.type==='month'||x.type==='year') out[x.type]=Number(x.value);
    return out;
  }catch(_){ return null; }
}
function jewishEvent(date){
  const h=datePartsInCalendar(date,'hebrew'); if(!h) return [];
  const key=`${h.month}-${h.day}`;
  const map={
    '1-1':['ראש השנה','jewish'],'1-2':['ראש השנה','jewish'],
    '1-10':['יום כיפור','jewish'],'1-15':['סוכות','jewish'],'1-22':['שמיני עצרת / שמחת תורה','jewish'],
    '3-25':['חנוכה','jewish'],'5-15':['ט״ו בשבט','jewish'],
    '7-14':['פורים','jewish'],'8-15':['פסח','jewish'],'8-21':['שביעי של פסח','jewish'],
    '10-6':['שבועות','jewish']
  };
  const v=map[key]; return v?[{date,name:v[0],kind:v[1]}]:[];
}
function muslimEvent(date){
  const h=datePartsInCalendar(date,'islamic'); if(!h) return [];
  const key=`${h.month}-${h.day}`;
  const map={
    '9-1':['תחילת רמדאן','muslim'],
    '10-1':['עיד אל־פיטר','muslim'],
    '12-10':['עיד אל־אדחא','muslim'],
    '1-1':['ראש השנה ההיג׳רית','muslim']
  };
  const v=map[key];
  return v?[{date,name:v[0],kind:v[1],note:'מועד מוסלמי מחושב לפי הלוח ההיג׳רי; ייתכן שינוי של יום לפי קביעת החודש.'}]:[];
}
function easterWestern(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function easterOrthodox(year){
  const a=year%4,b=year%7,c=year%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
  let month=Math.floor((d+e+114)/31),day=((d+e+114)%31)+1;
  const julian=new Date(Date.UTC(year,month-1,day));
  julian.setUTCDate(julian.getUTCDate()+13);
  return `${julian.getUTCFullYear()}-${String(julian.getUTCMonth()+1).padStart(2,'0')}-${String(julian.getUTCDate()).padStart(2,'0')}`;
}
function christianEvent(date){
  const y=Number(date.slice(0,4));
  const ev=[];
  if(date.endsWith('-12-25')) ev.push({date,name:'חג המולד',kind:'christian'});
  if(date.endsWith('-01-07')) ev.push({date,name:'חג המולד האורתודוקסי',kind:'christian'});
  if(date===easterWestern(y)) ev.push({date,name:'פסחא קתולית / פרוטסטנטית',kind:'christian'});
  if(date===easterOrthodox(y)) ev.push({date,name:'פסחא אורתודוקסית',kind:'christian'});
  return ev;
}
function nationalEvent(date){
  const recurring={
    '04-27':'יום הזיכרון לשואה ולגבורה',
    '05-14':'יום העצמאות',
    '05-13':'יום הזיכרון לחללי מערכות ישראל',
    '06-01':'יום ירושלים'
  };
  const n=recurring[date.slice(5)];
  return n?[{date,name:n,kind:'national',note:'מועד ממלכתי כללי; תאריכים מסוימים בישראל עשויים להיות מוזזים לפי כללי הלוח הרשמי.'}]:[];
}
const SPECIAL_EVENTS={
  '2026-10-27':[{date:'2026-10-27',name:'בחירות לכנסת ה־26',kind:'special',note:'אירוע חד־פעמי שמתעדכן עם גרסת האפליקציה.'}]
};
function calendarEventsForDate(date){
  const p=getCalendarPrefs();
  const out=[];
  if(p.jewish) out.push(...jewishEvent(date));
  if(p.muslim) out.push(...muslimEvent(date));
  if(p.christian) out.push(...christianEvent(date));
  if(p.national) out.push(...nationalEvent(date));
  if(p.special && SPECIAL_EVENTS[date]) out.push(...SPECIAL_EVENTS[date]);
  out.push(...personalEventsForDate(date).map(ev=>({
    date:ev.date,name:ev.title,kind:'personal',personalType:ev.type,
    note:[ev.startTime&&ev.endTime?`${ev.startTime}–${ev.endTime}`:(ev.startTime?`מ־${ev.startTime}`:(ev.endTime?`עד ${ev.endTime}`:'')),ev.notes].filter(Boolean).join(' · '),
    personalEventId:ev.id
  })));
  return out;
}
function calendarEventKindLabel(kind){
  return ({jewish:'חג יהודי',muslim:'חג מוסלמי',christian:'חג נוצרי',national:'יום ממלכתי',special:'אירוע מיוחד',personal:'אירוע אישי'})[kind]||'אירוע';
}
function calendarEventIcon(kind){
  return ({jewish:'✡',muslim:'☾',christian:'✦',national:'◆',special:'●',personal:'●'})[kind]||'•';
}
let currentDayDetailsDate=null;
const PERSONAL_EVENTS_KEY='salaryApp.personalCalendarEvents.v1';
function loadPersonalEvents(){
  try{
    const a=JSON.parse(localStorage.getItem(PERSONAL_EVENTS_KEY)||'[]');
    return Array.isArray(a)?a:[];
  }catch(_){return []}
}
function savePersonalEvents(arr){
  localStorage.setItem(PERSONAL_EVENTS_KEY,JSON.stringify(arr));
}
function personalEventsForDate(date){
  return loadPersonalEvents().filter(x=>x.date===date);
}
function personalEventTypeLabel(t){
  return ({personal:'אישי',sick:'מחלה',exam:'מבחן',vacation:'חופשה',appointment:'תור / פגישה',other:'אחר'})[t]||'אישי';
}
function personalEventIcon(t){
  return ({personal:'●',sick:'✚',exam:'✎',vacation:'☀',appointment:'◷',other:'•'})[t]||'●';
}
function openPersonalEventModal(date,id=null){
  const all=loadPersonalEvents();
  const ev=id?all.find(x=>x.id===id):null;
  $('personalEventId').value=ev?.id||'';
  $('personalEventDate').value=ev?.date||date||localDateIso();
  $('personalEventType').value=ev?.type||'personal';
  $('personalEventTitle').value=ev?.title||'';
  $('personalEventStart').value=ev?.startTime||'';
  $('personalEventEnd').value=ev?.endTime||'';
  $('personalEventNotes').value=ev?.notes||'';
  $('personalEventModalTitle').textContent=ev?'עריכת אירוע אישי':'אירוע אישי חדש';
  $('deletePersonalEventBtn').classList.toggle('hidden',!ev);
  $('personalEventModal').classList.remove('hidden');
  $('personalEventModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

function bindPersonalEventModalUi(){
  const modal=$('personalEventModal');
  const backdrop=$('personalEventBackdrop');
  if(!modal || modal.dataset.bound==='1') return;
  modal.dataset.bound='1';
  if(backdrop) backdrop.addEventListener('click',closePersonalEventModal);
}
document.addEventListener('DOMContentLoaded',bindPersonalEventModalUi);
function closePersonalEventModal(){
  $('personalEventModal').classList.add('hidden');
  $('personalEventModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}
function savePersonalEvent(){
  const date=$('personalEventDate').value;
  const title=$('personalEventTitle').value.trim();
  if(!date){alert('בחר תאריך.');return}
  if(!title){alert('הזן כותרת לאירוע.');return}
  const all=loadPersonalEvents();
  const id=$('personalEventId').value||('pe_'+Date.now()+'_'+Math.random().toString(36).slice(2,7));
  const old=all.find(x=>x.id===id);
  const ev={
    ...(old||{}),id,date,
    type:$('personalEventType').value||'personal',
    title,
    startTime:$('personalEventStart').value||'',
    endTime:$('personalEventEnd').value||'',
    notes:$('personalEventNotes').value.trim(),
    updatedAt:new Date().toISOString(),
    createdAt:old?.createdAt||new Date().toISOString()
  };
  const next=old?all.map(x=>x.id===id?ev:x):[...all,ev];
  savePersonalEvents(next);
  closePersonalEventModal();
  renderDashboardCalendar();
  if(currentDayDetailsDate===date) openDayDetails(date,{historyMode:'pop'});
}
function deletePersonalEventFromModal(){
  const id=$('personalEventId').value;
  if(!id) return;
  const all=loadPersonalEvents();
  const ev=all.find(x=>x.id===id);
  if(!ev) return;
  if(!confirm(`בטוח למחוק את האירוע "${ev.title}"?`)) return;
  savePersonalEvents(all.filter(x=>x.id!==id));
  const date=ev.date;
  closePersonalEventModal();
  renderDashboardCalendar();
  if(currentDayDetailsDate===date) openDayDetails(date,{historyMode:'pop'});
}



function dayShiftSummary(sh){
  const dd=(sh.ddType&&sh.ddNumber!=='')?displayShiftDd(sh):'משמרת';
  return `<button type="button" class="day-shift-card" onclick="openShiftDetails('${sh.id}')">
    <div class="day-shift-icon">${materialIcon('shifts')}</div>
    <div class="day-shift-main">
      <strong>${escapeHtml(dd)}</strong>
      <span>${escapeHtml(sh.start||'—')}–${escapeHtml(sh.end||'—')}</span>
    </div>
    <div class="day-shift-pay">${currency(calcShift(sh).totalPay)}</div>
    <span class="day-shift-chevron">‹</span>
  </button>`;
}

function openDayDetails(date,{historyMode='push'}={}){
  setTimeout(refreshDateInputDisplays,0);
  currentDayDetailsDate=date;
  const d=new Date(date+'T12:00:00');
  const title=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
  $('dayDetailsTitle').textContent=title;

  const events=calendarEventsForDate(date);
  const dayShifts=shifts.filter(s=>s.date===date).sort((a,b)=>(a.start||'').localeCompare(b.start||''));

  const eventsHtml=events.length
    ? events.map(ev=>`<div class="day-event-card event-${ev.kind}${ev.personalEventId?' personal-clickable':''}" ${ev.personalEventId?`role="button" tabindex="0" onclick="openPersonalEventModal('${date}','${ev.personalEventId}')"`:''}>
        <div class="day-event-icon">${ev.kind==='personal'?personalEventIcon(ev.personalType):calendarEventIcon(ev.kind)}</div>
        <div class="day-event-copy">
          <strong>${escapeHtml(ev.name)}</strong>
          <span>${ev.kind==='personal'?personalEventTypeLabel(ev.personalType):calendarEventKindLabel(ev.kind)}</span>
          ${ev.note?`<small>${escapeHtml(ev.note)}</small>`:''}
        </div>
      </div>`).join('')
    : `<div class="day-empty"><strong>יום רגיל</strong><span>אין אירוע מיוחד ביום הזה.</span></div>`;

  const shiftsHtml=dayShifts.length
    ? dayShifts.map(dayShiftSummary).join('')
    : `<div class="day-empty"><strong>אין משמרת</strong><span>אפשר להוסיף משמרת לתאריך הזה.</span></div>`;

  $('dayDetailsContent').innerHTML=`
    <div class="day-hero-card">
      <div class="day-big-number">${d.getDate()}</div>
      <div class="day-hero-copy">
        <strong>${title}</strong>
        <span>${events.length?events.map(x=>x.name).join(' · '):'יום רגיל'}${dayShifts.length?` · ${dayShifts.length} משמרת${dayShifts.length>1?'ות':''}`:''}</span>
      </div>
    </div>

    <section class="day-section">
      <div class="day-section-head">
  <h3>אירועים ביום</h3>
  <button type="button" class="secondary compact-day-add" onclick="openPersonalEventModal('${date}')">${materialIcon('add')}<span>אירוע</span></button>
</div>
      <div class="day-events-list">${eventsHtml}</div>
    </section>

    <section class="day-section">
      <div class="day-section-head">
        <h3>משמרות</h3>
        <button type="button" class="secondary compact-day-add" onclick="openAddShiftForDate('${date}')">${materialIcon('add')}<span>הוסף</span></button>
      </div>
      <div class="day-shifts-list">${shiftsHtml}</div>
    </section>`;

  showAppTab('dayDetailsPage',{remember:false,historyMode,dayDate:date});
  window.scrollTo({top:0,behavior:'instant'});
}
function closeDayDetails(){
  if(history.length>1) history.back();
  else showAppTab('mainDashboard',{remember:true,historyMode:'pop'});
}
function openAddShiftForDate(date){
  openShiftModal(false);
  setTimeout(()=>{
    if($('date')) $('date').value=date;
    if(typeof refreshDdPresetOptions==='function') refreshDdPresetOptions();
  },0);
}

const MATERIAL_ICONS={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.8 12 3.8l8.5 7v9.4H14.8v-5.7H9.2v5.7H3.5z"/></svg>',
  today:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/><circle cx="12" cy="14.2" r="2.3"/></svg>',
  shifts:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h5"/></svg>',
  summary:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V11M12 19V5M19 19v-8"/><path d="M3.5 19.5h17"/></svg>',
  add:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  trip:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16.5h14M7 16.5l1-7.2c.15-1.1 1.1-1.9 2.2-1.9h3.6c1.1 0 2.05.8 2.2 1.9l1 7.2"/><circle cx="8" cy="18.5" r="1.4"/><circle cx="16" cy="18.5" r="1.4"/><path d="M8.2 12h7.6"/></svg>',
  report:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 16h4"/></svg>',
  approval:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.2 2.4 2.4 5.2-5.4"/></svg>'
};
function materialIcon(name,cls='modern-icon'){return `<span class="${cls}">${MATERIAL_ICONS[name]||''}</span>`}
function upgradeModernIcons(){
  const navMap={mainDashboard:'home',todayDashboard:'today',shifts:'shifts',summary:'summary'};
  document.querySelectorAll('.tab[data-tab]').forEach(btn=>{
    const name=navMap[btn.dataset.tab];
    const el=btn.querySelector('.tab-icon');
    if(name&&el) el.innerHTML=MATERIAL_ICONS[name];
  });
  const add=document.querySelector('.nav-add-inner');
  if(add) add.innerHTML=MATERIAL_ICONS.add;
}
document.addEventListener('DOMContentLoaded',upgradeModernIcons);

const APP_THEME_KEY='salaryApp.theme.v1';
function getAppThemePrefs(){try{return Object.assign({mode:'light',color:'blue'},JSON.parse(localStorage.getItem(APP_THEME_KEY)||'{}'))}catch(_){return {mode:'light',color:'blue'}}}
function resolvedAppTheme(m){return m==='system'&&window.matchMedia? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m}
function applyAppTheme(){const p=getAppThemePrefs();document.documentElement.dataset.theme=resolvedAppTheme(p.mode);document.documentElement.dataset.appColor=p.color;document.querySelectorAll('[data-theme-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.themeMode===p.mode));document.querySelectorAll('[data-app-color]').forEach(b=>b.classList.toggle('selected',b.dataset.appColor===p.color))}
function setAppThemeMode(mode){const p=getAppThemePrefs();p.mode=mode;localStorage.setItem(APP_THEME_KEY,JSON.stringify(p));applyAppTheme()}
function setAppAccentColor(color){const p=getAppThemePrefs();p.color=color;localStorage.setItem(APP_THEME_KEY,JSON.stringify(p));applyAppTheme()}
if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: dark)');const f=()=>{if(getAppThemePrefs().mode==='system')applyAppTheme()};mq.addEventListener?mq.addEventListener('change',f):mq.addListener(f)}
document.addEventListener('DOMContentLoaded',applyAppTheme);applyAppTheme();

const VERSION_URL='./version.json';
const GOOGLE_CLIENT_ID='671607022405-ctegk4jl7koo9elm30odvsb1binp49cb.apps.googleusercontent.com';
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const DRIVE_BACKUP_FILE='salary-app-backup.json';
const KEY_DRIVE_BACKUP='salaryApp.driveBackup.v1';
let driveTokenClient=null;
let driveAccessToken='';
let driveTokenExpiresAt=0;
let drivePendingAction=null;

const HOME_WIDGETS=[
  {id:'forecast',label:'תחזית שכר'},
  {id:'calendar',label:'לוח שנה'},
  {id:'analytics',label:'השוואה וגרפים'},
  {id:'shiftValue',label:'כמה שווה לי משמרת?'}
];
let homeLayoutDraft=[];

const ANALYTICS_CHARTS=[
  {id:'gross',label:'ברוטו'},
  {id:'net',label:'נטו משוער'},
  {id:'hours',label:'שעות עבודה'},
  {id:'regular',label:'שעות רגילות'},
  {id:'ot125',label:'שעות 125%'},
  {id:'ot150',label:'שעות 150%'},
  {id:'saturday',label:'שעות שבת 225%'},
  {id:'night',label:'שעות לילה'}
];
let analyticsChartLayoutDraft=[];
function defaultAnalyticsChartLayout(){ return ANALYTICS_CHARTS.map((c,i)=>({id:c.id,visible:i<3})); }
function normalizeAnalyticsChartLayout(value){
  const incoming=Array.isArray(value)?value:[];
  const result=[]; const seen=new Set();
  incoming.forEach(item=>{
    const id=typeof item==='string'?item:item?.id;
    if(!ANALYTICS_CHARTS.some(c=>c.id===id) || seen.has(id)) return;
    result.push({id,visible:typeof item==='string'?true:item.visible!==false});
    seen.add(id);
  });
  ANALYTICS_CHARTS.forEach((c,i)=>{ if(!seen.has(c.id)) result.push({id:c.id,visible:incoming.length?false:i<3}); });
  return result;
}
function getSavedAnalyticsChartLayout(){
  const s=readStoredSettings();
  return s.analyticsChartLayout===undefined?defaultAnalyticsChartLayout():normalizeAnalyticsChartLayout(s.analyticsChartLayout);
}
function applyAnalyticsChartLayout(layout=getSavedAnalyticsChartLayout()){
  const container=$('analyticsChartsContainer'); if(!container) return;
  const normalized=normalizeAnalyticsChartLayout(layout);
  normalized.forEach(item=>{
    const el=container.querySelector(`[data-analytics-chart="${item.id}"]`);
    if(!el) return;
    el.classList.toggle('analytics-chart-hidden',!item.visible);
    container.appendChild(el);
  });
}
function renderAnalyticsChartLayoutEditor(){
  const list=$('analyticsChartLayoutList'); if(!list) return;
  if(!analyticsChartLayoutDraft.length) analyticsChartLayoutDraft=getSavedAnalyticsChartLayout();
  list.innerHTML=analyticsChartLayoutDraft.map((item,index)=>{
    const def=ANALYTICS_CHARTS.find(c=>c.id===item.id);
    return `<div class="analytics-chart-row">
      <label class="analytics-chart-main"><input type="checkbox" data-chart-visible="${item.id}" ${item.visible?'checked':''}><span>${escapeHtml(def?.label||item.id)}</span></label>
      <div class="analytics-chart-actions">
        <button type="button" class="analytics-chart-move" data-chart-move="up" data-chart-id="${item.id}" ${index===0?'disabled':''}>↑</button>
        <button type="button" class="analytics-chart-move" data-chart-move="down" data-chart-id="${item.id}" ${index===analyticsChartLayoutDraft.length-1?'disabled':''}>↓</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-chart-visible]').forEach(cb=>cb.onchange=()=>{
    const item=analyticsChartLayoutDraft.find(x=>x.id===cb.dataset.chartVisible);
    if(item) item.visible=cb.checked;
    applyAnalyticsChartLayout(analyticsChartLayoutDraft);
  });
  list.querySelectorAll('[data-chart-move]').forEach(btn=>btn.onclick=()=>{
    const i=analyticsChartLayoutDraft.findIndex(x=>x.id===btn.dataset.chartId);
    const target=btn.dataset.chartMove==='up'?i-1:i+1;
    if(i<0 || target<0 || target>=analyticsChartLayoutDraft.length) return;
    [analyticsChartLayoutDraft[i],analyticsChartLayoutDraft[target]]=[analyticsChartLayoutDraft[target],analyticsChartLayoutDraft[i]];
    renderAnalyticsChartLayoutEditor();
    applyAnalyticsChartLayout(analyticsChartLayoutDraft);
  });
}
function saveAnalyticsChartLayout(){
  const current=readStoredSettings();
  current.analyticsChartLayout=normalizeAnalyticsChartLayout(analyticsChartLayoutDraft.length?analyticsChartLayoutDraft:getSavedAnalyticsChartLayout());
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(current));
  analyticsChartLayoutDraft=current.analyticsChartLayout.map(x=>({...x}));
  applyAnalyticsChartLayout(analyticsChartLayoutDraft);
}

function defaultHomeLayout(){ return HOME_WIDGETS.map(w=>({id:w.id,visible:true})); }
function normalizeHomeLayout(value){
  const incoming=Array.isArray(value)?value:[];
  const result=[];
  const seen=new Set();
  incoming.forEach(item=>{
    const id=typeof item==='string'?item:item?.id;
    if(!HOME_WIDGETS.some(w=>w.id===id) || seen.has(id)) return;
    result.push({id,visible:typeof item==='string'?true:item.visible!==false});
    seen.add(id);
  });
  HOME_WIDGETS.forEach(w=>{ if(!seen.has(w.id)) result.push({id:w.id,visible:true}); });
  return result;
}
function readStoredSettings(){
  try{
    const s=JSON.parse(localStorage.getItem(KEY_SETTINGS)||'{}');
    return s && typeof s==='object' && !Array.isArray(s) ? s : {};
  }catch(e){ return {}; }
}
function getSavedHomeLayout(){ return normalizeHomeLayout(readStoredSettings().homeLayout); }
function applyHomeLayout(layout=getSavedHomeLayout()){
  const normalized=normalizeHomeLayout(layout);
  const section=$('mainDashboard');
  if(!section) return;
  let visibleCount=0;
  normalized.forEach(item=>{
    const el=section.querySelector(`[data-home-widget="${item.id}"]`);
    if(!el) return;
    el.classList.toggle('hidden',!item.visible);
    if(item.visible) visibleCount++;
    section.appendChild(el);
  });
  const empty=$('dashboardEmptyState');
  if(empty){
    empty.classList.toggle('hidden',visibleCount>0);
    section.appendChild(empty);
  }
}
function renderHomeLayoutEditor(){
  const list=$('homeLayoutList');
  if(!list) return;
  if(!homeLayoutDraft.length) homeLayoutDraft=getSavedHomeLayout();
  list.innerHTML=homeLayoutDraft.map((item,index)=>{
    const def=HOME_WIDGETS.find(w=>w.id===item.id);
    return `<div class="home-layout-row">
      <label class="home-layout-main"><input type="checkbox" data-home-visible="${item.id}" ${item.visible?'checked':''}><span>${escapeHtml(def?.label||item.id)}</span></label>
      <div class="home-layout-actions">
        <button type="button" class="home-layout-move" data-home-move="up" data-home-id="${item.id}" ${index===0?'disabled':''} aria-label="העבר למעלה">↑</button>
        <button type="button" class="home-layout-move" data-home-move="down" data-home-id="${item.id}" ${index===homeLayoutDraft.length-1?'disabled':''} aria-label="העבר למטה">↓</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-home-visible]').forEach(cb=>cb.onchange=()=>{
    const item=homeLayoutDraft.find(x=>x.id===cb.dataset.homeVisible);
    if(item) item.visible=cb.checked;
    applyHomeLayout(homeLayoutDraft);
  });
  list.querySelectorAll('[data-home-move]').forEach(btn=>btn.onclick=()=>{
    const i=homeLayoutDraft.findIndex(x=>x.id===btn.dataset.homeId);
    if(i<0) return;
    const target=btn.dataset.homeMove==='up'?i-1:i+1;
    if(target<0 || target>=homeLayoutDraft.length) return;
    [homeLayoutDraft[i],homeLayoutDraft[target]]=[homeLayoutDraft[target],homeLayoutDraft[i]];
    renderHomeLayoutEditor();
    applyHomeLayout(homeLayoutDraft);
  });
}
function saveHomeLayout(){
  const current=readStoredSettings();
  current.homeLayout=normalizeHomeLayout(homeLayoutDraft.length?homeLayoutDraft:getSavedHomeLayout());
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(current));
  homeLayoutDraft=current.homeLayout.map(x=>({...x}));
  applyHomeLayout(homeLayoutDraft);
}

function shiftSignature(sh){
  return [
    sh.date||'', sh.start||'', sh.end||'', String(sh.breakMin||0), String(sh.notes||''),
    sh.dayType||'auto', sh.splitEnd1||'', sh.splitStart2||'', sh.splitEnd2||'', String(!!sh.splitDidNotReturn), String(sh.bonus||0),
    sh.extraLoopType||'none', sh.nightLineType||'none',
    shiftLine(sh), sh.ddType||'', String(sh.ddNumber||'')
  ].join('|');
}

function dedupeShifts(list){
  const seen=new Set();
  return (Array.isArray(list)?list:[]).filter(sh=>{
    const sig=shiftSignature(sh);
    if(seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

let rawShifts=[];
try{
  rawShifts=JSON.parse(localStorage.getItem(KEY_SHIFTS)||'[]');
}catch(e){
  rawShifts=[];
}
let shifts=dedupeShifts(rawShifts);

// If old buggy versions created duplicates, clean them once on load.
if(shifts.length !== (Array.isArray(rawShifts)?rawShifts.length:0)){
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
}

let editingShiftId = null;

const DEFAULT_REPORT_TYPES=[
  'סיגנל סגור',
  'בקרה לא ענו',
  'איחור',
  'תקלה ברכבת',
  'אירוע עם נוסע',
  'אירוע בטיחותי',
  'הנחיה תפעולית',
  'אחר'
];
let reportShiftId=null;
let editingReportId=null;
let pendingReportCreatedAt=null;

function getReportTypes(){
  const s=readStoredSettings();
  const raw=Array.isArray(s.reportTypes)?s.reportTypes:[];
  const cleaned=[...new Set(raw.map(v=>String(v||'').trim()).filter(Boolean))];
  return cleaned.length?cleaned:[...DEFAULT_REPORT_TYPES];
}
function saveReportTypes(types){
  const current=readStoredSettings();
  current.reportTypes=[...new Set((types||[]).map(v=>String(v||'').trim()).filter(Boolean))];
  if(!current.reportTypes.length) current.reportTypes=[...DEFAULT_REPORT_TYPES];
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(current));
  renderReportTypesSettings();
  renderLineOperationalSettings();
  clearSettingsDirty();
}
function renderReportTypesSettings(){
  const list=$('reportTypesList');
  if(!list) return;
  const types=getReportTypes();
  list.innerHTML=types.map((type,i)=>`
    <span class="report-type-chip">
      <span>${escapeHtml(type)}</span>
      <button type="button" data-remove-report-type="${i}" aria-label="מחק סוג">×</button>
    </span>`).join('');
  list.querySelectorAll('[data-remove-report-type]').forEach(btn=>btn.onclick=()=>{
    const arr=getReportTypes();
    const i=Number(btn.dataset.removeReportType);
    if(!Number.isInteger(i) || i<0 || i>=arr.length) return;
    const removed=arr[i];
    if(!confirm(`להסיר את "${removed}" מרשימת סוגי הדוחות? דוחות קיימים לא יימחקו.`)) return;
    arr.splice(i,1);
    saveReportTypes(arr);
  });
}
function addReportType(){
  const input=$('newReportType');
  const value=String(input?.value||'').trim();
  if(!value) return;
  const arr=getReportTypes();
  if(arr.some(x=>x.toLocaleLowerCase('he')===value.toLocaleLowerCase('he'))){
    alert('סוג האירוע כבר קיים ברשימה.');
    return;
  }
  arr.push(value);
  saveReportTypes(arr);
  if(input) input.value='';
}
function localTimeHm(date=new Date()){
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
function formatDateTimeHe(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  try{return new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(d);}
  catch(e){return d.toLocaleString('he-IL');}
}
function normalizedReports(sh){
  return Array.isArray(sh?.reports)?sh.reports:[];
}
function reportById(sh,id){
  return normalizedReports(sh).find(r=>r.id===id);
}
function populateReportTypeSelect(selected=''){
  const select=$('reportType');
  if(!select) return;
  const types=getReportTypes();
  if(selected && !types.includes(selected)) types.push(selected);
  select.innerHTML=types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  select.value=selected && types.includes(selected)?selected:types[0];
}
function openReportModal(shiftId,reportId=''){
  const sh=shifts.find(x=>x.id===shiftId);
  if(!sh) return;
  reportShiftId=shiftId;
  editingReportId=reportId||null;
  const existing=editingReportId?reportById(sh,editingReportId):null;
  pendingReportCreatedAt=existing?.createdAt || new Date().toISOString();

  $('reportModalTitle').textContent=existing?'עריכת דוח נהג':'הוספת דוח נהג';
  const dd=(sh.ddType && sh.ddNumber!=='')?displayShiftDd(sh):lineLabel(shiftLine(sh));
  $('reportShiftInfo').textContent=`משמרת ${formatDateHe(sh.date)} · ${dd} · ${sh.dayType==='split'?`${sh.start}–${sh.splitEnd1||sh.end}${sh.splitStart2&&sh.splitEnd2?` / ${sh.splitStart2}–${sh.splitEnd2}`:''}`:`${sh.start}–${sh.end}`}`;
  $('reportCreatedAtLabel').textContent=formatDateTimeHe(pendingReportCreatedAt);
  $('reportEventTime').value=existing?.eventTime || localTimeHm();
  populateReportTypeSelect(existing?.type||'');
  const tripSelect=$('reportTrip');
  if(tripSelect){tripSelect.innerHTML=`<option value="">ללא קישור לנסיעה</option>`+normalizedTrips(sh).map((t,i)=>`<option value="${escapeHtml(t.id)}">חצי ${i+1} · ${escapeHtml(tripLabel(t))}</option>`).join('');tripSelect.value=existing?.tripId||'';}
  $('reportDescription').value=existing?.description||'';
  $('saveReportBtn').textContent=existing?'שמור שינויים':'שמור דוח';

  $('reportModal').classList.remove('hidden');
  $('reportModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeReportModal(){
  $('reportModal').classList.add('hidden');
  $('reportModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  reportShiftId=null;
  editingReportId=null;
  pendingReportCreatedAt=null;
}
function saveDriverReport(){
  const sh=shifts.find(x=>x.id===reportShiftId);
  if(!sh) return;
  const eventTime=String($('reportEventTime').value||'').trim();
  const type=String($('reportType').value||'').trim();
  const description=String($('reportDescription').value||'').trim();
  const tripId=String($('reportTrip')?.value||'');
  if(!eventTime){ alert('בחר זמן אירוע.'); return; }
  if(!type){ alert('בחר סוג אירוע.'); return; }
  if(!description){ alert('כתוב תיאור לדוח.'); return; }

  const reports=normalizedReports(sh).map(r=>({...r}));
  if(editingReportId){
    const i=reports.findIndex(r=>r.id===editingReportId);
    if(i<0) return;
    reports[i]={...reports[i],eventTime,type,description,tripId,updatedAt:new Date().toISOString()};
  }else{
    reports.push({
      id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,
      createdAt:pendingReportCreatedAt || new Date().toISOString(),
      eventTime,
      type,
      description,
      tripId
    });
  }
  sh.reports=reports;
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  const shiftId=sh.id;
  closeReportModal();
  renderTodayDashboard();
  renderShifts();
  openShiftDetails(shiftId);
}
function deleteDriverReport(shiftId,reportId){
  const sh=shifts.find(x=>x.id===shiftId);
  if(!sh) return;
  const report=reportById(sh,reportId);
  if(!report) return;
  if(!confirm(`למחוק את הדוח מסוג "${report.type}"?`)) return;
  sh.reports=normalizedReports(sh).filter(r=>r.id!==reportId);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  const returnView=currentVisibleAppView();
  returnAfterTripAction(shiftId,returnView);
}
function reportsHtmlForShift(sh){
  const reports=normalizedReports(sh).slice().sort((a,b)=>{
    const ta=String(a.eventTime||'');
    const tb=String(b.eventTime||'');
    if(ta!==tb) return ta.localeCompare(tb);
    return String(a.createdAt||'').localeCompare(String(b.createdAt||''));
  });
  if(!reports.length) return `<p class="note" style="margin:8px 0 0">אין דוחות מקושרים למשמרת הזו.</p>`;
  return `<div class="report-list">${reports.map(r=>`
    <details class="report-accordion">
      <summary>
        <span class="report-accordion-type">${escapeHtml(r.type||'ללא סוג')}</span>
        <span class="report-accordion-time">${escapeHtml(r.eventTime||'—')}</span>
      </summary>
      <div class="report-accordion-body">
        <div class="report-accordion-created">נוצר: ${escapeHtml(formatDateTimeHe(r.createdAt)||'—')}</div>
        ${r.tripId&&tripById(sh,r.tripId)?`<div class="report-accordion-created">נסיעה: ${escapeHtml(tripLabel(tripById(sh,r.tripId)))}</div>`:''}
        <div class="report-text">${escapeHtml(r.description||'')}</div>
        <div class="report-actions">
          <button type="button" class="secondary" onclick="openReportModal('${sh.id}','${r.id}')">ערוך</button>
          <button type="button" class="danger" onclick="deleteDriverReport('${sh.id}','${r.id}')">מחק</button>
        </div>
      </div>
    </details>`).join('')}</div>`;
}
window.openReportModal=openReportModal;
window.deleteDriverReport=deleteDriverReport;


let tripShiftId=null,editingTripId=null;
let tripReturnView='';

function normalizedTrips(sh){return Array.isArray(sh?.trips)?sh.trips:[]}
function tripById(sh,id){return normalizedTrips(sh).find(t=>t.id===id)}

function hmToMinutes(hm){
  const m=String(hm||'').match(/^(\d{1,2}):(\d{2})$/);
  if(!m) return null;
  return Number(m[1])*60+Number(m[2]);
}
function durationBetweenHm(start,end){
  const s=hmToMinutes(start),e=hmToMinutes(end);
  if(s===null||e===null) return 0;
  let d=e-s;
  if(d<0)d+=1440;
  return d;
}
function hmAddMinutes(hm,mins){
  const m=String(hm||'').match(/^(\d{1,2}):(\d{2})$/);
  if(!m)return'';
  let x=(+m[1]*60 + +m[2]+mins)%1440;
  if(x<0)x+=1440;
  return `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;
}

function tripTypeOf(t){ return t?.tripType==='empty'?'empty':'commercial'; }
function isEmptyTrip(t){ return tripTypeOf(t)==='empty'; }
function updateTripTypeUi(){
  const empty=$('tripType')?.value==='empty';
  $('tripPlannedEndWrap')?.classList.toggle('hidden',empty);
  $('tripTimingControls')?.classList.toggle('hidden',empty);
  $('tripTimingNote')?.classList.toggle('hidden',empty);
  if($('tripTypeHint')){
    $('tripTypeHint').textContent=empty
      ? 'ריק / חזרה לדיפו: נשמרות רק שעות ההתחלה והסיום, ללא חישוב הקדמה או איחור.'
      : 'נסיעה מסחרית: מחושב בזמן / איחור / הקדמה לפי אורך הסיבוב והטולרנס של הקו.';
  }
  updateTripDurationUi();
}
function tripTimingFromDuration(startTime,endTime,line='red'){
  const actual=durationBetweenHm(startTime,endTime);
  const cfg=lineOperationalConfig(line);
  if(!endTime || !actual) return {status:'active',minutes:0,actual:0,planned:cfg.plannedTripMinutes,tolerance:cfg.onTimeToleranceMinutes};
  const diff=actual-cfg.plannedTripMinutes;
  if(Math.abs(diff)<=cfg.onTimeToleranceMinutes) return {status:'on_time',minutes:0,actual,planned:cfg.plannedTripMinutes,tolerance:cfg.onTimeToleranceMinutes};
  if(diff>cfg.onTimeToleranceMinutes) return {status:'late',minutes:diff,actual,planned:cfg.plannedTripMinutes,tolerance:cfg.onTimeToleranceMinutes};
  return {status:'early',minutes:Math.abs(diff),actual,planned:cfg.plannedTripMinutes,tolerance:cfg.onTimeToleranceMinutes};
}
function tripTimingAgainstPlannedEnd(t,sh=null,endTime=null){
  const actual=endTime||t?.endTime||'';
  if(!t?.plannedEnd || !actual) return null;
  const base=sh?.start||t?.plannedStart||'00:00';
  const planned=timelineSortMinute(t.plannedEnd,base);
  let ended=timelineSortMinute(actual,base);
  if(ended<planned-720) ended+=1440;
  const diff=ended-planned;
  if(diff===0) return {status:'on_time',minutes:0};
  return diff>0?{status:'late',minutes:diff}:{status:'early',minutes:Math.abs(diff)};
}
function tripTimingText(t,sh=null){
  if(t?.active && !t?.endTime) return isEmptyTrip(t)?'ריק · בנסיעה':'בנסיעה';
  if(isEmptyTrip(t)) return 'ריק / חזרה לדיפו';
  if(t?.plannedEnd && !t?.endTime) return 'מתוכנן';
  const x=tripTimingAgainstPlannedEnd(t,sh)||tripTimingFromDuration(t?.startTime,t?.endTime,shiftLine(sh));
  if(x.status==='late') return `איחור ${x.minutes} דק׳`;
  if(x.status==='early') return `הקדמה ${x.minutes} דק׳`;
  return 'בזמן';
}
function inferTripTiming(t,sh=null){
  if(isEmptyTrip(t)) return {status:'on_time',minutes:0};
  if(t?.endTime){
    const x=tripTimingAgainstPlannedEnd(t,sh)||tripTimingFromDuration(t.startTime,t.endTime,shiftLine(sh));
    return {status:x.status==='active'?'on_time':x.status,minutes:x.minutes||0};
  }
  if(t?.timingStatus && t.timingStatus!=='active') return {status:t.timingStatus,minutes:Math.max(0,Number(t.varianceMinutes||0))};
  return {status:'on_time',minutes:0};
}
function tripLabel(t){
  return [isEmptyTrip(t)?'ריק': '',t.startPoint,t.rb,t.trainNumber?`רכבת ${t.trainNumber}`:'',t.startTime&&t.endTime?`${t.startTime}–${t.endTime}`:''].filter(Boolean).join(' · ')||'חצי סיבוב';
}
function updateTripDurationUi({syncEnd=false}={}){
  const start=$('tripStartTime')?.value||'';
  const empty=$('tripType')?.value==='empty';
  const status=$('tripTimingStatus')?.value||'on_time';
  let variance=Math.max(0,Number($('tripTimingMinutes')?.value||0));
  if(status==='on_time') variance=0;

  const sh=shifts.find(x=>x.id===tripShiftId), editing=sh&&editingTripId?tripById(sh,editingTripId):null;
  const cfg=lineOperationalConfig(shiftLine(sh));
  const plannedEnd=empty?'':(editing?.plannedEnd||hmAddMinutes(start,cfg.plannedTripMinutes));
  if($('tripPlannedEndTime') && !editing?.plannedEnd) $('tripPlannedEndTime').value=plannedEnd;

  if($('tripTimingMinutes')){
    $('tripTimingMinutes').disabled=status==='on_time';
    if(status==='on_time') $('tripTimingMinutes').value='0';
  }

  if(syncEnd && start && !empty){
    const actualMinutes=cfg.plannedTripMinutes + (status==='late'?variance:status==='early'?-variance:0);
    $('tripEndTime').value=hmAddMinutes(start,Math.max(0,actualMinutes));
  }

  const actualDuration=durationBetweenHm(start,$('tripEndTime')?.value||'');
  const summary=$('tripDurationSummary');
  if(summary){
    summary.innerHTML=empty
      ? `<div class="trip-duration-box"><span>משך ריק בפועל</span><strong>${actualDuration?fmtMin(actualDuration):'—'}</strong></div>`
      : `<div class="trip-duration-box"><span>זמן מתוכנן</span><strong>${fmtMin(cfg.plannedTripMinutes)}</strong></div>
         <div class="trip-duration-box"><span>זמן נהיגה בפועל</span><strong>${actualDuration?fmtMin(actualDuration):'—'}</strong></div>`;
  }
}
function syncTimingFromActualEnd(){
  if($('tripType')?.value==='empty'){ updateTripDurationUi(); return; }
  const start=$('tripStartTime')?.value||'';
  const end=$('tripEndTime')?.value||'';
  if(!end){ updateTripDurationUi(); return; }
  const x=tripTimingFromDuration(start,end,shiftLine(shifts.find(x=>x.id===tripShiftId)));
  if(x.status==='late'){
    $('tripTimingStatus').value='late';
    $('tripTimingMinutes').value=String(x.minutes);
  }else if(x.status==='early'){
    $('tripTimingStatus').value='early';
    $('tripTimingMinutes').value=String(x.minutes);
  }else{
    $('tripTimingStatus').value='on_time';
    $('tripTimingMinutes').value='0';
  }
  updateTripDurationUi();
}
function activeTripRecord(){
  for(const sh of shifts){
    const t=normalizedTrips(sh).find(x=>x?.active && !x?.endTime);
    if(t) return {shift:sh,trip:t};
  }
  return null;
}
function activeTripForShift(sh){
  return normalizedTrips(sh).find(t=>t?.active && !t?.endTime)||null;
}
function nextUnstartedPlannedTrip(sh){
  return normalizedTrips(sh).filter(t=>t.plannedStart&&!t.startTime&&!t.endTime)
    .sort((a,b)=>timelineSortMinute(a.plannedStart,sh.start)-timelineSortMinute(b.plannedStart,sh.start))[0]||null;
}
function tripElapsedMinutes(sh,t,now=new Date()){
  if(!sh||!t?.startTime) return 0;
  const [y,m,d]=String(sh.date||'').split('-').map(Number);
  const [hh,mm]=String(t.startTime).split(':').map(Number);
  if(!y||!m||!d||Number.isNaN(hh)||Number.isNaN(mm)) return 0;
  const start=new Date(y,m-1,d,hh,mm,0,0);
  if(now<start) return 0;
  return Math.max(0,Math.floor((now-start)/60000));
}
function startPlannedTripNow(shiftId,tripId){
  const sh=shifts.find(x=>x.id===shiftId); if(!sh) return;
  const t=tripById(sh,tripId); if(!t) return;
  const current=activeTripRecord();
  if(current){alert(`כבר קיים סיבוב פעיל שהתחיל ב־${current.trip.startTime}. יש לסיים אותו קודם.`);return;}
  if(t.endTime){openTripModal(shiftId,tripId);return;}
  t.startTime=localTimeHm(); t.active=true; t.timingStatus='active'; t.updatedAt=new Date().toISOString();
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  renderTodayDashboard();renderShifts();refreshLiveQuickActions();
  if(!$('shiftDetailsPage')?.classList.contains('hidden')) openShiftDetails(shiftId,{historyMode:'pop'});
}
window.startPlannedTripNow=startPlannedTripNow;
function finishActiveTripNow(shiftId,tripId){
  const sh=shifts.find(x=>x.id===shiftId); if(!sh) return;
  const t=tripById(sh,tripId); if(!t) return;
  if(!t.active || t.endTime){ openTripModal(shiftId,tripId); return; }
  const endTime=localTimeHm();
  const empty=isEmptyTrip(t);
  const timing=empty?null:(tripTimingAgainstPlannedEnd(t,sh,endTime)||tripTimingFromDuration(t.startTime,endTime,shiftLine(sh)));
  t.endTime=endTime;
  t.active=false;
  t.timingStatus=empty?'not_applicable':(timing.status==='active'?'on_time':timing.status);
  t.varianceMinutes=empty?0:(timing.minutes||0);
  t.updatedAt=new Date().toISOString();
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  renderTodayDashboard(); renderShifts();
  if(!$('shiftDetailsModal')?.classList.contains('hidden')) openShiftDetails(shiftId);
}
window.finishActiveTripNow=finishActiveTripNow;

function currentVisibleAppView(){
  if(!$('shiftDetailsPage')?.classList.contains('hidden')) return 'shiftDetails';
  if(!$('todayDashboard')?.classList.contains('hidden')) return 'today';
  if(!$('dayDetailsPage')?.classList.contains('hidden')) return 'day';
  if(!$('shifts')?.classList.contains('hidden')) return 'shifts';
  if(!$('mainDashboard')?.classList.contains('hidden')) return 'main';
  return '';
}
function returnAfterTripAction(shiftId,view){
  renderTodayDashboard();
  renderShifts();
  refreshLiveQuickActions();
  if(view==='shiftDetails'){
    openShiftDetails(shiftId,{historyMode:'pop'});
  }else if(view==='today'){
    showAppTab('todayDashboard',{remember:true,historyMode:'pop'});
  }else if(view==='day' && currentDayDetailsDate){
    openDayDetails(currentDayDetailsDate,{historyMode:'pop'});
  }else if(view==='shifts'){
    showAppTab('shifts',{remember:true,historyMode:'pop'});
  }else if(view==='main'){
    showAppTab('mainDashboard',{remember:true,historyMode:'pop'});
  }
}
function openTripModal(shiftId,tripId=''){
  const sh=shifts.find(x=>x.id===shiftId);if(!sh)return;
  tripReturnView=currentVisibleAppView();
  tripShiftId=shiftId;editingTripId=tripId||null;
  const t=editingTripId?tripById(sh,editingTripId):null;
  const start=t?.startTime||(t?.plannedStart?'':localTimeHm());
  const inferred=inferTripTiming(t,sh);

  $('tripModalTitle').textContent=t?'עריכת חצי סיבוב':'הוספת סיבוב';
  $('tripShiftInfo').textContent=`משמרת ${formatDateHe(sh.date)} · ${sh.start}–${sh.end}`;
  populateTripStartPoints(sh,t?.startPoint||'',!t);
  if(t) $('tripStartPoint').value=t?.startPoint||'';
  const smartPoint=!t?suggestedNextTripPoint(sh):'';
  if($('tripSmartHint')){
    $('tripSmartHint').textContent=smartPoint?`הנקודה הבאה הוצעה אוטומטית: ${smartPoint}. אפשר לשנות או להשאיר ריק.`:'';
    $('tripSmartHint').classList.toggle('hidden',!smartPoint);
  }
  $('tripType').value=tripTypeOf(t);
  $('tripRb').value=t?.rb||'';
  $('tripTrainNumber').value=t?.trainNumber||'';
  $('tripStartTime').value=start;
  $('tripPlannedStartWrap')?.classList.toggle('hidden',!t?.plannedStart);
  if($('tripPlannedStartTime')) $('tripPlannedStartTime').value=t?.plannedStart||'';
  if($('tripPlannedEndTime')) $('tripPlannedEndTime').value=t?.plannedEnd||'';
  $('tripTimingStatus').value=inferred.status;
  $('tripTimingMinutes').value=String(inferred.minutes||0);
  $('tripEndTime').value=t?.endTime||'';
  $('tripPostDriveFields')?.classList.toggle('hidden',!t);
  $('tripQuickHint')?.classList.toggle('hidden',!!t);
  $('saveTripBtn').textContent=t?'שמור שינויים':'התחל סיבוב';
  updateTripTypeUi();

  $('tripModal').classList.remove('hidden');
  $('tripModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeTripModal(){
  $('tripModal').classList.add('hidden');
  $('tripModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  tripShiftId=null;editingTripId=null;
}
function saveTrip(){
  const sh=shifts.find(x=>x.id===tripShiftId);if(!sh)return;
  const tripType=$('tripType')?.value==='empty'?'empty':'commercial';
  const startPoint=$('tripStartPoint').value;
  const rb=$('tripRb').value.trim();
  const trainNumber=$('tripTrainNumber').value.trim();
  const startTime=$('tripStartTime').value;
  const endTime=$('tripEndTime').value||'';
  const plannedStart=$('tripPlannedStartTime')?.value||'';
  const plannedEnd=$('tripPlannedEndTime')?.value||'';

  const a=normalizedTrips(sh).map(t=>({...t}));
  const editingExisting=editingTripId?a.find(t=>t.id===editingTripId):null;
  if(!startTime && !editingExisting?.plannedStart){alert('יש להזין שעת התחלה.');return}
  if(editingTripId){
    const i=a.findIndex(t=>t.id===editingTripId);if(i<0)return;
    if(a[i].plannedStart && !startTime && !endTime){
      a[i]={...a[i],tripType,startPoint,rb,trainNumber,plannedStart:plannedStart||a[i].plannedStart,plannedEnd:plannedEnd||a[i].plannedEnd,updatedAt:new Date().toISOString()};
      sh.trips=a; localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
      const sid=sh.id,returnView=tripReturnView; closeTripModal(); returnAfterTripAction(sid,returnView); tripReturnView=''; return;
    }
    let timingStatus=tripType==='empty'?'not_applicable':'on_time',varianceMinutes=0,active=!endTime;
    if(endTime){
      if(tripType!=='empty'){
        const timing=tripTimingAgainstPlannedEnd(a[i],sh,endTime)||tripTimingFromDuration(startTime,endTime,shiftLine(sh));
        timingStatus=timing.status==='active'?'on_time':timing.status;
        varianceMinutes=timing.minutes||0;
      }
      active=false;
    }else{
      const other=activeTripRecord();
      if(other && !(other.shift.id===sh.id && other.trip.id===editingTripId)){
        alert('כבר קיים סיבוב פעיל. יש לסיים אותו לפני השארת סיבוב אחר פעיל.');
        return;
      }
    }
    a[i]={...a[i],tripType,startPoint,rb,trainNumber,startTime,endTime,active,timingStatus,varianceMinutes,plannedStart:plannedStart||a[i].plannedStart||'',plannedEnd:plannedEnd||a[i].plannedEnd||'',plannedMinutes:tripType==='empty'?null:lineOperationalConfig(shiftLine(sh)).plannedTripMinutes,updatedAt:new Date().toISOString()};
  }else{
    const current=activeTripRecord();
    if(current){
      alert(`כבר קיים סיבוב פעיל שהתחיל ב־${current.trip.startTime}. יש לסיים אותו לפני התחלת סיבוב חדש.`);
      return;
    }
    a.push({
      id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,
      createdAt:new Date().toISOString(),
      tripType,startPoint,rb,trainNumber,startTime,endTime:'',
      active:true,timingStatus:tripType==='empty'?'not_applicable':'on_time',varianceMinutes:0,
      plannedMinutes:tripType==='empty'?null:lineOperationalConfig(shiftLine(sh)).plannedTripMinutes
    });
  }

  sh.trips=a;
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  const sid=sh.id;
  const returnView=tripReturnView;
  closeTripModal();
  returnAfterTripAction(sid,returnView);
  tripReturnView='';
}
function deleteTrip(shiftId,tripId){
  const sh=shifts.find(x=>x.id===shiftId);if(!sh)return;
  const t=tripById(sh,tripId);
  if(!t||!confirm(`למחוק את ${tripLabel(t)}?`))return;
  sh.trips=normalizedTrips(sh).filter(x=>x.id!==tripId);
  sh.reports=normalizedReports(sh).map(r=>r.tripId===tripId?{...r,tripId:''}:r);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  renderTodayDashboard();renderShifts();openShiftDetails(shiftId);
}
function tripsHtmlForShift(sh){
  const a=normalizedTrips(sh).slice().sort((x,y)=>timelineSortMinute(x.plannedStart||x.startTime,sh.start)-timelineSortMinute(y.plannedStart||y.startTime,sh.start));
  if(!a.length)return `<p class="note" style="margin:8px 0 0">אין סיבובים מתוכננים או מתועדים למשמרת הזו.</p>`;
  return `<div class="trip-list">${a.map((t,i)=>{
    const active=!!(t.active&&!t.endTime), planned=!!t.plannedStart;
    const actual=active?tripElapsedMinutes(sh,t):(t.startTime&&t.endTime?durationBetweenHm(t.startTime,t.endTime):0);
    const plannedDuration=planned?durationBetweenHm(t.plannedStart,t.plannedEnd):lineOperationalConfig(shiftLine(sh)).plannedTripMinutes;
    const route=[t.startPoint,t.endPoint].filter(Boolean).join(' ← ');
    return `<div class="trip-card">
      <div class="trip-card-title">${isEmptyTrip(t)?'נסיעה ריקה':'סיבוב'} ${i+1} · ${escapeHtml(route||t.startPoint||'נקודת התחלה לא הוזנה')} ${active?'<span class="trip-active-badge">● בנסיעה</span>':''}</div>
      ${planned?`<div class="trip-card-meta">תכנון: ${escapeHtml(t.plannedStart)}–${escapeHtml(t.plannedEnd)}${t.plannedRb?` · ${escapeHtml(t.plannedRb)}`:''}</div>`:''}
      <div class="trip-card-meta">בפועל: ${escapeHtml(t.startTime||'טרם התחיל')}–${active?'עכשיו':escapeHtml(t.endTime||'—')}${t.rb?` · ${escapeHtml(t.rb)}`:''}${t.trainNumber?` · רכבת ${escapeHtml(t.trainNumber)}`:''}</div>
      <div class="trip-card-meta">מתוכנן ${fmtMin(plannedDuration)}${(active||actual)?` · ${active?'זמן שחלף':'בפועל'} ${actual?fmtMin(actual):'—'}`:''} · ${escapeHtml(tripTimingText(t,sh))}</div>
      <div class="trip-actions">
        ${planned&&!t.startTime&&!t.endTime?`<button class="primary" onclick="startPlannedTripNow('${sh.id}','${t.id}')">▶ התחל סיבוב</button>`:''}
        ${active?`<button class="primary" onclick="finishActiveTripNow('${sh.id}','${t.id}')">⏹ סיום סיבוב</button>`:''}
        <button class="secondary" onclick="openTripModal('${sh.id}','${t.id}')">ערוך</button>
        <button class="danger" onclick="deleteTrip('${sh.id}','${t.id}')">מחק</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}
window.openTripModal=openTripModal;
window.deleteTrip=deleteTrip;

let approvalShiftId=null;
let editingApprovalId=null;

function normalizedApprovals(sh){
  return Array.isArray(sh?.approvals)?sh.approvals:[];
}
function approvalById(sh,id){
  return normalizedApprovals(sh).find(a=>a.id===id);
}
function openApprovalModal(shiftId,approvalId=''){
  const sh=shifts.find(x=>x.id===shiftId);
  if(!sh) return;
  approvalShiftId=shiftId;
  editingApprovalId=approvalId||null;
  const existing=editingApprovalId?approvalById(sh,editingApprovalId):null;
  const dd=(sh.ddType && sh.ddNumber!=='')?displayShiftDd(sh):lineLabel(shiftLine(sh));
  $('approvalShiftInfo').textContent=`משמרת ${formatDateHe(sh.date)} · ${dd} · ${sh.start}–${sh.end}`;
  $('approvalModalTitle').textContent=existing?'עריכת אישור / שינוי משמרת':'הוספת אישור / שינוי משמרת';
  $('approvalWhat').value=existing?.what||'';
  $('approvalBy').value=existing?.approvedBy||'';
  $('approvalNote').value=existing?.note||'';
  $('saveApprovalBtn').textContent=existing?'שמור שינויים':'שמור';
  $('approvalModal').classList.remove('hidden');
  $('approvalModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeApprovalModal(){
  $('approvalModal').classList.add('hidden');
  $('approvalModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  approvalShiftId=null;
  editingApprovalId=null;
}
function saveShiftApproval(){
  const sh=shifts.find(x=>x.id===approvalShiftId);
  if(!sh) return;
  const what=String($('approvalWhat').value||'').trim();
  const approvedBy=String($('approvalBy').value||'').trim();
  const note=String($('approvalNote').value||'').trim();
  if(!what){ alert('כתוב מה קרה.'); return; }
  if(!approvedBy){ alert('כתוב באישור של מי.'); return; }

  const approvals=normalizedApprovals(sh).map(a=>({...a}));
  if(editingApprovalId){
    const i=approvals.findIndex(a=>a.id===editingApprovalId);
    if(i<0) return;
    approvals[i]={...approvals[i],what,approvedBy,note,updatedAt:new Date().toISOString()};
  }else{
    approvals.push({
      id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,
      createdAt:new Date().toISOString(),
      what,approvedBy,note
    });
  }
  sh.approvals=approvals;
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  const sid=sh.id;
  closeApprovalModal();
  renderTodayDashboard();
  renderShifts();
  openShiftDetails(sid);
}
function deleteShiftApproval(shiftId,approvalId){
  const sh=shifts.find(x=>x.id===shiftId);
  if(!sh) return;
  const a=approvalById(sh,approvalId);
  if(!a) return;
  if(!confirm(`למחוק את הרישום "${a.what}"?`)) return;
  sh.approvals=normalizedApprovals(sh).filter(x=>x.id!==approvalId);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  renderTodayDashboard();
  renderShifts();
  openShiftDetails(shiftId);
}
function approvalsHtmlForShift(sh){
  const items=normalizedApprovals(sh).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  if(!items.length) return `<p class="note" style="margin:8px 0 0">אין אישורים או שינויים מתועדים למשמרת הזו.</p>`;
  return `<div class="approval-list">${items.map(a=>`
    <div class="approval-card">
      <div class="approval-card-head">
        <div>
          <div class="approval-card-title">${escapeHtml(a.what||'')}</div>
          <div class="approval-card-meta">באישור: ${escapeHtml(a.approvedBy||'—')} · נוצר: ${escapeHtml(formatDateTimeHe(a.createdAt)||'—')}</div>
        </div>
      </div>
      ${a.note?`<div class="approval-card-text">${escapeHtml(a.note)}</div>`:''}
      <div class="approval-actions">
        <button type="button" class="secondary" onclick="openApprovalModal('${sh.id}','${a.id}')">ערוך</button>
        <button type="button" class="danger" onclick="deleteShiftApproval('${sh.id}','${a.id}')">מחק</button>
      </div>
    </div>`).join('')}</div>`;
}
window.openApprovalModal=openApprovalModal;
window.deleteShiftApproval=deleteShiftApproval;


const settingIds = ['baseRate','travelPerDay','travelMonthlyCap','perDiemPerDay','nightPct','holidayPct','nightStart','nightEnd',
'regularDailyHours','ot125Hours','halfLoopAmount','fullLoopAmount','nightLine2Amount','nightLine3Amount','nightLineOver3Amount',
'tax10UpTo','tax14UpTo','tax20UpTo','tax31UpTo','tax35UpTo','tax47UpTo',
'niReducedUpTo','niMaxIncome','niLowPct','niHighPct','healthLowPct','healthHighPct',
'creditPoints','creditPointValue','pensionPct','otherDeductPct'];

function defaultLinePoints(line){
  if(line==='red') return ['נווה יעקב','הדסה עין כרם'];
  if(line==='yellow') return ['טורים','מלחה'];
  return [];
}
function normalizeLinePoints(points,line=''){
  const source=Array.isArray(points)?points:defaultLinePoints(line);
  return [...new Set(source.map(x=>String(x||'').trim()).filter(Boolean))];
}
function getSettings(){
  let s={};
  settingIds.forEach(id=>{
    const el=$(id);
    s[id]=el.type==='checkbox'?el.checked:el.value;
  });
  const current=readStoredSettings();
  const lineOperationalSettings={...(current.lineOperationalSettings||{})};
  document.querySelectorAll('[data-line-op-key]').forEach(card=>{
    const key=card.dataset.lineOpKey;
    const planned=Math.max(1,Math.round(Number(card.querySelector('[data-line-op-planned]')?.value||68)));
    const tolerance=Math.max(0,Math.round(Number(card.querySelector('[data-line-op-tolerance]')?.value||1)));
    const points=[...card.querySelectorAll('[data-line-point]')].map(el=>el.value.trim()).filter(Boolean);
    lineOperationalSettings[key]={
      ...(lineOperationalSettings[key]||{}),
      plannedTripMinutes:planned,
      onTimeToleranceMinutes:tolerance,
      points:normalizeLinePoints(points,key)
    };
  });
  s.lineOperationalSettings=lineOperationalSettings;
  return s;
}
function lineOperationalConfig(line='red'){
  const s=readStoredSettings();
  const x=s.lineOperationalSettings?.[line]||{};
  return {
    plannedTripMinutes:Math.max(1,Math.round(Number(x.plannedTripMinutes||68))),
    onTimeToleranceMinutes:Math.max(0,Math.round(Number(x.onTimeToleranceMinutes??1))),
    points:normalizeLinePoints(x.points,line)
  };
}
function linePoints(line='red'){ return lineOperationalConfig(line).points; }
function linePointRow(point=''){
  return `<div class="line-point-row">
    <input data-line-point type="text" maxlength="80" value="${escapeHtml(point)}" placeholder="שם נקודת קצה">
    <button type="button" class="line-point-remove" data-remove-line-point aria-label="הסר נקודה">×</button>
  </div>`;
}
function bindLineOperationalCard(card){
  card.querySelectorAll('[data-remove-line-point]').forEach(btn=>btn.onclick=()=>{
    btn.closest('.line-point-row')?.remove();
    markSettingsDirty();
  });
  card.querySelector('[data-add-line-point]')?.addEventListener('click',()=>{
    const list=card.querySelector('[data-line-points-list]');
    if(!list) return;
    list.insertAdjacentHTML('beforeend',linePointRow(''));
    bindLineOperationalCard(card);
    list.querySelector('.line-point-row:last-child input')?.focus();
    markSettingsDirty();
  },{once:true});
}
function renderLineOperationalSettings(){
  const host=$('lineOperationalSettingsList'); if(!host)return;
  const s=readStoredSettings();
  host.innerHTML=availableLines().map(({key,label})=>{
    const x=s.lineOperationalSettings?.[key]||{};
    const planned=Math.max(1,Math.round(Number(x.plannedTripMinutes||68)));
    const tolerance=Math.max(0,Math.round(Number(x.onTimeToleranceMinutes??1)));
    const points=normalizeLinePoints(x.points,key);
    return `<div class="line-op-card" data-line-op-key="${escapeHtml(key)}">
      <div class="line-op-title">קו ${escapeHtml(label)}</div>
      <div class="line-op-grid">
        <div><label>אורך חצי סיבוב מתוכנן (דקות)</label><input data-line-op-planned type="number" min="1" step="1" value="${planned}"></div>
        <div><label>טווח שנחשב בזמן ± (דקות)</label><input data-line-op-tolerance type="number" min="0" step="1" value="${tolerance}"></div>
      </div>
      <div class="line-points-head">
        <div><strong>נקודות קצה / תחילת סיבוב</strong><div class="note">הנהג יכול לבחור אחת מהן בתחילת סיבוב, או להשאיר ריק ולעדכן אחר כך.</div></div>
        <button type="button" class="secondary line-point-add" data-add-line-point>הוסף נקודה</button>
      </div>
      <div class="line-points-list" data-line-points-list>${points.map(linePointRow).join('')}</div>
      <div class="note" style="margin-top:8px">לדוגמה: ±1 אומר שסטייה של עד דקה מוקדם או מאוחר עדיין נחשבת בזמן.</div>
    </div>`;
  }).join('');
  host.querySelectorAll('[data-line-op-key]').forEach(bindLineOperationalCard);
}
function suggestedNextTripPoint(sh){
  const points=linePoints(shiftLine(sh)); if(points.length<2) return '';
  const trips=normalizedTrips(sh).filter(t=>String(t.startPoint||'').trim());
  if(!trips.length) return '';
  const current=String(trips[trips.length-1].startPoint||'').trim();
  const i=points.indexOf(current); if(i<0) return '';
  return points[(i+1)%points.length]||'';
}
function populateTripStartPoints(sh,selected='',suggest=false){
  const el=$('tripStartPoint'); if(!el) return;
  const points=linePoints(shiftLine(sh));
  const chosen=selected||((suggest)?suggestedNextTripPoint(sh):'');
  const values=[...points]; if(chosen&&!values.includes(chosen)) values.push(chosen);
  el.innerHTML=`<option value="">לא חובה — אפשר לבחור אחר כך</option>`+
    values.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  el.value=chosen||'';
}
function saveSettings(){
  const current=readStoredSettings();
  const next={...current,...getSettings(),homeLayout:normalizeHomeLayout(homeLayoutDraft.length?homeLayoutDraft:current.homeLayout),analyticsChartLayout:normalizeAnalyticsChartLayout(analyticsChartLayoutDraft.length?analyticsChartLayoutDraft:(current.analyticsChartLayout===undefined?defaultAnalyticsChartLayout():current.analyticsChartLayout))};
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(next));
}
function loadSettings(){
  const s=readStoredSettings();
  settingIds.forEach(id=>{
    if(s[id]!==undefined){
      const el=$(id);
      if(el.type==='checkbox') el.checked=!!s[id]; else el.value=s[id];
    }
  });
  homeLayoutDraft=normalizeHomeLayout(s.homeLayout);
  analyticsChartLayoutDraft=s.analyticsChartLayout===undefined?defaultAnalyticsChartLayout():normalizeAnalyticsChartLayout(s.analyticsChartLayout);
  applyHomeLayout(homeLayoutDraft);
  applyAnalyticsChartLayout(analyticsChartLayoutDraft);
  renderHomeLayoutEditor();
  renderAnalyticsChartLayoutEditor();
  renderReportTypesSettings();
  renderLineOperationalSettings();
}

const DEFAULT_NOTIFICATION_PREFERENCES={
  shift:{enabled:false,leadMinutes:60},
  monthly:{enabled:false,day:1,time:'14:00'},
  weekly:{enabled:false,day:0,time:'18:00'}
};

function getNotificationPreferences(){
  const s=readStoredSettings();
  const raw=s.notificationPreferences||{};
  return {
    shift:{
      enabled:!!raw.shift?.enabled,
      leadMinutes:Number(raw.shift?.leadMinutes||DEFAULT_NOTIFICATION_PREFERENCES.shift.leadMinutes)
    },
    monthly:{
      enabled:!!raw.monthly?.enabled,
      day:Math.min(28,Math.max(1,Number(raw.monthly?.day||DEFAULT_NOTIFICATION_PREFERENCES.monthly.day))),
      time:raw.monthly?.time||DEFAULT_NOTIFICATION_PREFERENCES.monthly.time
    },
    weekly:{
      enabled:!!raw.weekly?.enabled,
      day:Math.min(6,Math.max(0,Number(raw.weekly?.day??DEFAULT_NOTIFICATION_PREFERENCES.weekly.day))),
      time:raw.weekly?.time||DEFAULT_NOTIFICATION_PREFERENCES.weekly.time
    }
  };
}

function loadNotificationPreferences(){
  const p=getNotificationPreferences();
  if($('notifyShiftEnabled')) $('notifyShiftEnabled').checked=p.shift.enabled;
  if($('notifyShiftLead')) $('notifyShiftLead').value=String(p.shift.leadMinutes);
  if($('notifyMonthlyEnabled')) $('notifyMonthlyEnabled').checked=p.monthly.enabled;
  if($('notifyMonthlyDay')) $('notifyMonthlyDay').value=String(p.monthly.day);
  if($('notifyMonthlyTime')) $('notifyMonthlyTime').value=p.monthly.time;
  if($('notifyWeeklyEnabled')) $('notifyWeeklyEnabled').checked=p.weekly.enabled;
  if($('notifyWeeklyDay')) $('notifyWeeklyDay').value=String(p.weekly.day);
  if($('notifyWeeklyTime')) $('notifyWeeklyTime').value=p.weekly.time;
}

function saveNotificationPreferences(){
  const current=readStoredSettings();
  const next={
    ...current,
    notificationPreferences:{
      shift:{
        enabled:!!$('notifyShiftEnabled')?.checked,
        leadMinutes:Number($('notifyShiftLead')?.value||60)
      },
      monthly:{
        enabled:!!$('notifyMonthlyEnabled')?.checked,
        day:Math.min(28,Math.max(1,Number($('notifyMonthlyDay')?.value||1))),
        time:$('notifyMonthlyTime')?.value||'14:00'
      },
      weekly:{
        enabled:!!$('notifyWeeklyEnabled')?.checked,
        day:Math.min(6,Math.max(0,Number($('notifyWeeklyDay')?.value||0))),
        time:$('notifyWeeklyTime')?.value||'18:00'
      }
    }
  };
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(next));
  loadNotificationPreferences();
}

function activateTabById(tabId){
  const btn=document.querySelector(`.tab[data-tab="${tabId}"]`);
  if(btn) btn.click();
}

function openDeepLinkFromUrl(){
  try{
    const u=new URL(location.href);
    const view=u.searchParams.get('view');
    if(!view) return;

    if(view==='summary'){
      const month=u.searchParams.get('month');
      activateTabById('summary');
      if(month && /^\d{4}-\d{2}$/.test(month)){
        $('monthFilter').value=month;
        renderSummary();
      }
    }else if(view==='shift'){
      const id=u.searchParams.get('id');
      activateTabById('shifts');
      if(id){
        const sh=shifts.find(x=>x.id===id);
        if(sh) setTimeout(()=>openShiftDetails(id),50);
      }
    }

    // Keep the normal app URL after handling the deep link.
    u.search='';
    history.replaceState({},'',u.toString());
  }catch(e){
    console.warn('Deep link handling failed',e);
  }
}


function toMin(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function fmtMin(min){
  min=Math.max(0,Math.round(min)); const h=Math.floor(min/60), m=min%60;
  return `${h}:${String(m).padStart(2,'0')}`;
}
function currency(n){ return new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(n||0); }
function overlap(a1,a2,b1,b2){ return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1)); }


function splitShiftInfo(sh){
  if(sh?.dayType!=='split') return {isSplit:false,returned:false,provisional:false,didNotReturn:false,gapMinutes:null,gapOk:true,workedMinutes:null,paidMinutes:null};

  const start1=sh.start||'', end1=sh.splitEnd1||sh.end||'', start2=sh.splitStart2||'', end2=sh.splitEnd2||'';
  const didNotReturn=!!sh.splitDidNotReturn;
  const hasSecond=!!(start2&&end2);

  // Planned split imported from DD but real split times are not known yet:
  // calculate provisionally from the DD start/end, without the +1 split hour.
  const provisional=!didNotReturn && !hasSecond && !sh.splitEnd1;
  if(provisional){
    const ddMinutes=durationBetweenHm(sh.start,sh.end);
    return {
      isSplit:true,returned:false,provisional:true,didNotReturn:false,
      gapMinutes:null,gapOk:true,start1:sh.start,end1:sh.end,start2:'',end2:'',
      seg1:ddMinutes,seg2:0,workedMinutes:ddMinutes,splitBonusMinutes:0,paidMinutes:ddMinutes
    };
  }

  const seg1=durationBetweenHm(start1,end1);
  const returned=hasSecond && !didNotReturn;
  const seg2=returned?durationBetweenHm(start2,end2):0;
  let gapMinutes=null;
  if(returned){
    let e1=toMin(end1), s2=toMin(start2);
    if(s2<e1) s2+=1440;
    gapMinutes=Math.max(0,s2-e1);
  }
  const workedMinutes=Math.max(0,seg1+seg2);
  const splitBonusMinutes=returned?60:0;
  return {
    isSplit:true,returned,provisional:false,didNotReturn,gapMinutes,gapOk:!returned||gapMinutes>=180,
    start1,end1,start2,end2,seg1,seg2,workedMinutes,
    splitBonusMinutes,paidMinutes:workedMinutes+splitBonusMinutes
  };
}
function splitGapText(info){
  if(!info?.returned) return 'חלק שני לא הוזן — אין תוספת שעת פיצול.';
  if(info.gapMinutes<180) return `⚠ הפיצול הוא ${fmtMin(info.gapMinutes)} בלבד — פחות מ־3 שעות. כדאי לדבר עם הסדרן ולסדר את זה.`;
  return `הפסקת פיצול: ${fmtMin(info.gapMinutes)} ✓`;
}
function updateSplitShiftUi(){
  const isSplit=$('dayType')?.value==='split';
  const splitBox=$('splitShiftFields');
  splitBox?.classList.toggle('hidden',!isSplit);
  if(splitBox) splitBox.setAttribute('aria-hidden',isSplit?'false':'true');
  if($('startLabel')) $('startLabel').textContent=isSplit?'כניסה 1 / תחילת DD':'שעת התחלה';
  if($('endLabel')) $('endLabel').textContent=isSplit?'יציאה 1 / סוף DD זמני':'שעת סיום';

  const info=$('splitGapInfo');
  if(!info) return;
  if(!isSplit){
    info.className='split-gap-info';
    info.textContent='';
    if($('splitStart2')) $('splitStart2').value='';
    if($('splitEnd2')) $('splitEnd2').value='';
    if($('splitDidNotReturn')) $('splitDidNotReturn').checked=false;
    return;
  }

  const didNotReturn=!!$('splitDidNotReturn')?.checked;
  const end1=$('end')?.value||'', start2=$('splitStart2')?.value||'', end2=$('splitEnd2')?.value||'';

  if(didNotReturn){
    info.className='split-gap-info ok';
    info.textContent='סומן שלא חזרת לחלק השני — יחושב רק החלק הראשון וללא תוספת שעת פיצול.';
    return;
  }
  if(!start2 && !end2){
    info.className='split-gap-info';
    info.textContent='שעות הפיצול עדיין לא עודכנו — החישוב יכול להישאר זמני לפי שעות ה־DD.';
    return;
  }
  if(!start2 || !end2){
    info.className='split-gap-info warn';
    info.textContent='הוזן רק חלק מהחלק השני. אפשר לשמור ולעדכן בהמשך.';
    return;
  }
  if(!end1){
    info.className='split-gap-info';
    info.textContent='';
    return;
  }
  let e1=toMin(end1), s2=toMin(start2);
  if(s2<e1) s2+=1440;
  const gap=s2-e1;
  info.className=`split-gap-info ${gap<180?'warn':'ok'}`;
  info.textContent=gap<180
    ? `⚠ הפיצול הוא ${fmtMin(gap)} בלבד — פחות מ־3 שעות. דבר עם הסדרן כדי לסדר את זה.`
    : `הפסקת פיצול: ${fmtMin(gap)} ✓`;
}
function determineDayType(dateStr, forced){
  if(forced && forced!=='auto') return forced;
  const d=new Date(dateStr+'T12:00:00');
  const wd=d.getDay();
  if(wd===5) return 'friday';
  if(wd===6) return 'saturday';
  return 'regular';
}
function dayMultiplier(type,s){
  if(type==='holiday') return Number(s.holidayPct)/100;
  return 1;
}
function calcShift(sh){
  const s=getSettings();

  if(!sh.extraLoopType){
    if(sh.extraLoop) sh.extraLoopType='full';
    else sh.extraLoopType='none';
  }
  if(!sh.nightLineType){
    if(sh.nightLine2) sh.nightLineType='to2';
    else if(sh.nightLine3) sh.nightLineType='to3';
    else sh.nightLineType='none';
  }

  const split=splitShiftInfo(sh);
  let start=toMin(sh.start), end=toMin(sh.end);
  if(end<=start) end+=1440;
  const breakMin=Number(sh.breakMin||0);

  let workedMinutes=0;
  let splitBonusMinutes=0;
  let grossMinutes=0;
  if(split.isSplit){
    workedMinutes=Math.max(0,split.workedMinutes-breakMin);
    splitBonusMinutes=split.returned?60:0;
    grossMinutes=workedMinutes+splitBonusMinutes;
  }else{
    workedMinutes=Math.max(0,end-start-breakMin);
    grossMinutes=workedMinutes;
  }

  const base=Number(s.baseRate);
  // Split is a payroll pattern, but the underlying rate logic is a regular workday.
  const type=split.isSplit?'regular':determineDayType(sh.date, sh.dayType);

  const regCap=Number(s.regularDailyHours)*60;
  const ot1Cap=Number(s.ot125Hours)*60;
  let regMin=0, ot1Min=0, ot2Min=0;
  let regPay=0, ot1Pay=0, ot2Pay=0, nightExtra=0;

  let ns=toMin(s.nightStart), ne=toMin(s.nightEnd);
  const nightOverlapFor=(a,b)=>{
    let aa=toMin(a),bb=toMin(b);
    if(bb<=aa)bb+=1440;
    if(ns<ne) return overlap(aa,bb,ns,ne)+overlap(aa,bb,ns+1440,ne+1440);
    return overlap(aa,bb,ns,1440)+overlap(aa,bb,0,ne)+overlap(aa,bb,1440,ne+1440);
  };
  let nightMin=0;
  if(split.isSplit){
    nightMin=nightOverlapFor(split.start1,split.end1);
    if(split.returned) nightMin+=nightOverlapFor(split.start2,split.end2);
    nightMin=Math.min(nightMin,workedMinutes);
  }else{
    if(ns<ne){
      nightMin=overlap(start,end,ns,ne)+overlap(start,end,ns+1440,ne+1440);
    }else{
      nightMin=overlap(start,end,ns,1440)+overlap(start,end,0,ne)+overlap(start,end,1440,ne+1440);
    }
    nightMin=Math.min(nightMin,grossMinutes);
  }

  if(type==='saturday'){
    nightMin=0;
    regMin=grossMinutes;
    regPay=grossMinutes/60*base*2.25;
    ot1Min=0; ot2Min=0; nightExtra=0;
  }else if(type==='friday'){
    ot1Min=Math.min(grossMinutes,120);
    ot2Min=Math.max(0,grossMinutes-120);
    ot1Pay=ot1Min/60*base*1.25;
    ot2Pay=ot2Min/60*base*1.50;
    regMin=0;
    nightExtra=0;
  }else{
    // The split bonus hour is added to the payable-hour total, so it can fall
    // into regular, 125% or 150% exactly according to the daily thresholds.
    regMin=Math.min(grossMinutes,regCap);
    ot1Min=Math.min(Math.max(0,grossMinutes-regCap),ot1Cap);
    ot2Min=Math.max(0,grossMinutes-regCap-ot1Cap);
    const dm=dayMultiplier(type,s);
    regPay=regMin/60*base*dm;
    ot1Pay=ot1Min/60*base*Math.max(dm,1.25);
    ot2Pay=ot2Min/60*base*Math.max(dm,1.50);
    nightExtra=nightMin/60*base*(Number(s.nightPct)/100);
  }

  const travel=Number(s.travelPerDay||0);
  const perDiem=Number(s.perDiemPerDay||0);
  const bonus=Number(sh.bonus||0);

  let extraLoopPay = 0;
  if(sh.extraLoopType==='half') extraLoopPay = Number(s.halfLoopAmount||0);
  if(sh.extraLoopType==='full') extraLoopPay = Number(s.fullLoopAmount||0);

  let nightLinePay = 0;
  if(sh.nightLineType==='to2') nightLinePay = Number(s.nightLine2Amount||0);
  if(sh.nightLineType==='to3') nightLinePay = Number(s.nightLine3Amount||0);
  if(sh.nightLineType==='over3') nightLinePay = Number(s.nightLineOver3Amount||0);

  const specialPay = extraLoopPay + nightLinePay;
  const pay=regPay+ot1Pay+ot2Pay+nightExtra+travel+perDiem+bonus+specialPay;

  return {
    grossMinutes,workedMinutes,splitBonusMinutes,splitReturned:split.returned,
    splitGapMinutes:split.gapMinutes,splitGapOk:split.gapOk,isSplit:split.isSplit,splitProvisional:split.provisional,provisional:split.provisional,didNotReturn:split.didNotReturn,
    regMin,ot1Min,ot2Min,nightMin,type,
    regPay,ot1Pay,ot2Pay,nightExtra,travel,perDiem,bonus,
    extraLoopPay,nightLinePay,specialPay,pay
  };
}

function monthlyTravelForShifts(list){
  const s=getSettings();
  const perDay=Math.max(0,Number(s.travelPerDay||0));
  const cap=Math.max(0,Number(s.travelMonthlyCap||0));
  const workDays=new Set((Array.isArray(list)?list:[]).map(sh=>sh.date).filter(Boolean)).size;
  const uncapped=workDays*perDay;
  const paid=cap>0 ? Math.min(uncapped,cap) : uncapped;
  return {workDays,perDay,cap,uncapped,paid,capReached:cap>0 && uncapped>cap};
}

function shiftMatchesSpecialFilter(sh, filter){
  if(!filter || filter==='all') return true;

  const extra = sh.extraLoopType || (sh.extraLoop ? 'full' : 'none');
  let night = sh.nightLineType;
  if(!night){
    if(sh.nightLine2) night='to2';
    else if(sh.nightLine3) night='to3';
    else night='none';
  }

  const dayType = determineDayType(sh.date, sh.dayType);

  if(filter==='friday') return dayType==='friday';
  if(filter==='saturday') return dayType==='saturday';
  if(filter==='half') return extra==='half';
  if(filter==='full') return extra==='full';
  if(filter==='nightAny') return night!=='none';
  if(filter==='to2') return night==='to2';
  if(filter==='to3') return night==='to3';
  if(filter==='over3') return night==='over3';
  if(filter==='none') return extra==='none' && night==='none';
  return true;
}

function normalizeDdSearch(value){
  return String(value||'').toUpperCase().replace(/\s+/g,'').trim();
}

function getFilteredShifts(){
  const month=$('shiftMonthFilter')?.value || '';
  const special=$('shiftSpecialFilter')?.value || 'all';
  const ddSearch=normalizeDdSearch($('shiftDdSearch')?.value || '');

  return shifts.filter(sh=>{
    const monthOk=!month || sh.date.startsWith(month);
    if(!monthOk || !shiftMatchesSpecialFilter(sh,special)) return false;

    if(ddSearch){
      const shiftDd=normalizeDdSearch(
        (sh.ddType && sh.ddNumber!=='') ? `${sh.ddType}${sh.ddNumber}` : ''
      );
      if(!shiftDd.includes(ddSearch)) return false;
    }
    return true;
  });
}

const selectedShiftIds=new Set();

function updateBulkDeleteBar(){
  // remove IDs that no longer exist
  const existingIds=new Set(shifts.map(sh=>sh.id));
  [...selectedShiftIds].forEach(id=>{
    if(!existingIds.has(id)) selectedShiftIds.delete(id);
  });

  const count=selectedShiftIds.size;
  $('bulkDeleteCount').textContent=String(count);
  $('bulkDeleteBar').classList.toggle('hidden',count===0);
}

function toggleShiftSelection(id,checked){
  if(checked) selectedShiftIds.add(id);
  else selectedShiftIds.delete(id);

  updateBulkDeleteBar();
}

function deleteSelectedShifts(){
  const count=selectedShiftIds.size;
  if(!count) return;

  if(!confirm(`למחוק ${count} ${count===1?'משמרת מסומנת':'משמרות מסומנות'}?`)) return;

  shifts=shifts.filter(sh=>!selectedShiftIds.has(sh.id));
  selectedShiftIds.clear();
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));

  renderShifts();
  renderSummary();
  if(typeof renderPayslipComparison==='function') renderPayslipComparison();
}

function renderShifts(){
  const filtered=getFilteredShifts().slice().sort((a,b)=>b.date.localeCompare(a.date));

  if($('shiftFilterCount')){
    $('shiftFilterCount').textContent=`${filtered.length} ${filtered.length===1?'משמרת':'משמרות'}`;
  }

  if(!filtered.length){
    $('shiftList').innerHTML='<div class="muted">אין משמרות שמתאימות לחודש ולסינון שנבחרו.</div>';
    updateBulkDeleteBar();
    return;
  }

  $('shiftList').innerHTML=filtered.map(sh=>{
    const c=calcShift(sh);
    const label=sh.dayType==='split'?'פיצול':({regular:'רגיל',friday:'שישי',saturday:'שבת',holiday:'חג'}[c.type]);
    const selected=selectedShiftIds.has(sh.id);
    return `<div class="shift" data-shift-id="${escapeHtml(sh.id)}">
      <div class="shift-head">
        <div class="shift-select-wrap">
          <input
            type="checkbox"
            class="shift-select"
            aria-label="בחר משמרת ${escapeHtml(formatDateHe(sh.date))}"
            ${selected?'checked':''}
            onchange="toggleShiftSelection('${sh.id}',this.checked)"
          >
          <div>
            <button type="button" class="shift-date-link" onclick="openShiftDetails('${sh.id}')">${sh.date.slice(8,10)}/${sh.date.slice(5,7)} · ${escapeHtml(dayNameHe(sh.date))}</button>
            <div style="margin-top:3px">${sh.start}–${sh.end}</div>
            ${(sh.ddType && sh.ddNumber!=='')?`<div style="margin-top:3px;font-weight:700">${escapeHtml(displayShiftDd(sh))}</div>`:''}
            ${sh.dayType==='split'?`<div style="margin-top:4px;font-size:12px">${escapeHtml(sh.start||'—')}–${escapeHtml(sh.splitEnd1||sh.end||'—')}${sh.splitStart2&&sh.splitEnd2?` · ${escapeHtml(sh.splitStart2)}–${escapeHtml(sh.splitEnd2)}`:(sh.splitDidNotReturn?' · לא חזר לחלק שני':' · זמני לפי DD')}</div>${c.splitReturned&&!c.splitGapOk?`<div class="split-detail-warning">⚠ פיצול קצר מ־3 שעות — לבדוק מול הסדרן</div>`:''}`:''}
            <div style="margin-top:6px">
            <span class="pill">${label}</span>
            ${c.type==='saturday'?`<span class="pill">225%</span>`:''}
            <span class="pill">${fmtMin(c.grossMinutes)} שעות לתשלום</span>
            ${c.isSplit?`<span class="pill">עבודה בפועל ${fmtMin(c.workedMinutes)}</span>`:''}
            ${c.splitBonusMinutes?`<span class="pill">+1:00 פיצול</span>`:''}
            ${c.nightMin?`<span class="pill">${fmtMin(c.nightMin)} לילה</span>`:''}
            ${sh.extraLoopType==='half'?`<span class="pill">חצי סיבוב</span>`:''}
            ${sh.extraLoopType==='full'?`<span class="pill">סיבוב</span>`:''}
            ${sh.nightLineType==='to2'?`<span class="pill">קווי לילה עד 02:00</span>`:''}
            ${sh.nightLineType==='to3'?`<span class="pill">קווי לילה עד 03:00</span>`:''}
            ${sh.nightLineType==='over3'?`<span class="pill">קווי לילה מעל 03:00</span>`:''}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="secondary" onclick="editShift('${sh.id}')">ערוך</button>
          <button class="danger" onclick="deleteShift('${sh.id}')">מחק</button>
        </div>
      </div>
      <div class="muted" style="margin-top:7px">שכר למשמרת: <strong>${currency(c.pay)}</strong></div>
    </div>`;
  }).join('');

  updateBulkDeleteBar();
}

window.toggleShiftSelection=toggleShiftSelection;
window.deleteSelectedShifts=deleteSelectedShifts;

function detailMoney(n){ return currency(Number(n||0)); }

function timelineClockFromIso(iso){
  if(!iso) return '';
  const d=new Date(iso); if(Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function timelineSortMinute(hm,shiftStart){
  const m=hmToMinutes(hm), s=hmToMinutes(shiftStart);
  if(m===null) return 99999;
  if(s===null) return m;
  return m<s ? m+1440 : m;
}
function normalizedPlannedEvents(sh){return Array.isArray(sh?.plannedEvents)?sh.plannedEvents:[]}
function shiftClockByMinutes(hm,delta){return hmAddMinutes(hm,delta)}
function effectivePlannedEvent(sh,e){
  let delta=0;
  const prev=normalizedTrips(sh).filter(t=>Number.isFinite(Number(t.sourceIndex))&&Number(t.sourceIndex)<Number(e.sourceIndex)&&t.plannedEnd&&t.endTime)
    .sort((a,b)=>Number(b.sourceIndex)-Number(a.sourceIndex))[0];
  if(prev){
    const p=timelineSortMinute(prev.plannedEnd,sh.start), a=timelineSortMinute(prev.endTime,sh.start);
    delta=a-p;
  }
  return {...e,effectiveStart:shiftClockByMinutes(e.plannedStart,delta),effectiveEnd:shiftClockByMinutes(e.plannedEnd,delta),delayMinutes:delta};
}
function shiftBreakInfo(sh){
  const plannedTrips=normalizedTrips(sh).filter(t=>t.plannedStart).slice().sort((a,b)=>timelineSortMinute(a.plannedStart,sh.start)-timelineSortMinute(b.plannedStart,sh.start));
  const scans=normalizedPlannedEvents(sh).filter(e=>e.type==='סריקה ביטחונית').map(e=>effectivePlannedEvent(sh,e)).sort((a,b)=>timelineSortMinute(a.effectiveStart,sh.start)-timelineSortMinute(b.effectiveStart,sh.start));
  if(plannedTrips.length && scans.length){
    const gaps=[];
    scans.forEach(scan=>{
      const scanEnd=timelineSortMinute(scan.effectiveEnd,sh.start);
      const next=plannedTrips.filter(t=>Number(t.sourceIndex)>Number(scan.sourceIndex)).sort((a,b)=>Number(a.sourceIndex)-Number(b.sourceIndex))[0];
      if(!next) return;
      let nextStart=timelineSortMinute(next.plannedStart,sh.start);
      if(nextStart<timelineSortMinute(scan.plannedEnd,sh.start)) nextStart+=1440;
      const minutes=Math.max(0,nextStart-scanEnd);
      if(minutes>0) gaps.push({time:scan.effectiveEnd,endTime:next.plannedStart,minutes,afterScan:true});
    });
    return {known:true,minutes:gaps.reduce((n,g)=>n+g.minutes,0),gaps};
  }
  const trips=normalizedTrips(sh).filter(t=>t.startTime).slice().sort((a,b)=>timelineSortMinute(a.startTime,sh.start)-timelineSortMinute(b.startTime,sh.start));
  if(!trips.length) return {known:false,minutes:0,gaps:[],reason:'לא הוכנסו סיבובים'};
  if(trips.length===1) return {known:true,minutes:0,gaps:[]};
  const gaps=[];
  for(let i=0;i<trips.length-1;i++){
    const a=trips[i], b=trips[i+1];
    if(!a.endTime || !b.startTime) return {known:false,minutes:0,gaps:[],reason:'חסרות שעות בסיבובים'};
    let end=timelineSortMinute(a.endTime,sh.start), start=timelineSortMinute(b.startTime,sh.start);
    if(start<end) start+=1440;
    let minutes=Math.max(0,start-end);
    // A split-shift gap is tracked separately and is not counted as an ordinary break.
    if(sh.dayType==='split' && sh.splitEnd1 && sh.splitStart2){
      let gs=timelineSortMinute(sh.splitEnd1,sh.start), ge=timelineSortMinute(sh.splitStart2,sh.start);
      if(ge<gs) ge+=1440;
      const overlap=Math.max(0,Math.min(start,ge)-Math.max(end,gs));
      minutes=Math.max(0,minutes-overlap);
    }
    if(minutes>0) gaps.push({after:i+1,before:i+2,time:a.endTime,endTime:b.startTime,minutes});
  }
  return {known:true,minutes:gaps.reduce((n,g)=>n+g.minutes,0),gaps};
}
function totalDrivingMinutes(sh,{live=false}={}){
  let total=0;
  normalizedTrips(sh).forEach(t=>{
    if(t?.active&&!t?.endTime){
      if(live) total+=tripElapsedMinutes(sh,t);
    }else if(t?.startTime&&t?.endTime){
      total+=durationBetweenHm(t.startTime,t.endTime);
    }
  });
  return total;
}
function elapsedWorkedMinutes(sh,now=new Date()){
  if(!sh?.date||!sh?.start) return 0;
  const [y,m,d]=sh.date.split('-').map(Number);
  const dateBase=(hm)=>{
    if(!hm) return null;
    const [hh,mm]=hm.split(':').map(Number);
    return new Date(y,m-1,d,hh,mm,0,0);
  };
  const elapsedInterval=(aHm,bHm)=>{
    const a=dateBase(aHm), b=dateBase(bHm); if(!a||!b) return 0;
    if(b<=a) b.setDate(b.getDate()+1);
    if(now<=a) return 0;
    const stop=now<b?now:b;
    return Math.max(0,Math.floor((stop-a)/60000));
  };
  if(sh.dayType==='split' && sh.splitEnd1){
    let x=elapsedInterval(sh.start,sh.splitEnd1);
    if(sh.splitStart2&&sh.splitEnd2) x+=elapsedInterval(sh.splitStart2,sh.splitEnd2);
    return x;
  }
  return elapsedInterval(sh.start,sh.end);
}
function shiftOperationalMetrics(sh,{live=false}={}){
  const c=calcShift(sh);
  const breaks=shiftBreakInfo(sh);
  const driving=totalDrivingMinutes(sh,{live});
  const baseWork=live?elapsedWorkedMinutes(sh):Number(c.workedMinutes??c.grossMinutes??0);
  const breakMinutes=breaks.known?breaks.minutes:0;
  const undocumented=breaks.known?Math.max(0,baseWork-driving-breakMinutes):null;
  return {driving,breaksKnown:breaks.known,breakMinutes,undocumented,baseWork};
}
function operationalMetricsHtml(sh,{live=false}={}){
  const m=shiftOperationalMetrics(sh,{live});
  const split=splitShiftInfo(sh);
  return `<div class="ops-metrics">
    <div class="ops-metric"><span>נהיגה מתועדת</span><strong>${fmtMin(m.driving)}</strong></div>
    <div class="ops-metric"><span>הפסקות בין סיבובים</span><strong>${m.breaksKnown?fmtMin(m.breakMinutes):'לא ידוע'}</strong></div>
    <div class="ops-metric"><span>הפסקת פיצול</span><strong>${split.returned&&split.gapMinutes!==null?fmtMin(split.gapMinutes):'—'}</strong></div>
    <div class="ops-metric"><span>זמן לא מתועד</span><strong>${m.undocumented===null?'לא ידוע':fmtMin(m.undocumented)}</strong></div>
  </div>`;
}
function shiftLiveState(sh,now=new Date()){
  if(!sh?.date||!sh?.start) return {visible:false,state:'none'};
  const [y,m,d]=String(sh.date).split('-').map(Number);
  if(!y||!m||!d) return {visible:false,state:'none'};
  const mk=(hm)=>{
    if(!hm) return null;
    const [hh,mm]=String(hm).split(':').map(Number);
    if(Number.isNaN(hh)||Number.isNaN(mm)) return null;
    return new Date(y,m-1,d,hh,mm,0,0);
  };
  const inInterval=(aHm,bHm)=>{
    const a=mk(aHm), b=mk(bHm); if(!a||!b) return false;
    if(b<=a) b.setDate(b.getDate()+1);
    return now>=a && now<=b;
  };

  if(sh.dayType==='split'){
    const s=splitShiftInfo(sh);
    if(s.returned){
      const first=inInterval(s.start1,s.end1);
      const second=inInterval(s.start2,s.end2);
      if(first||second) return {visible:true,state:'working'};
      const e1=mk(s.end1), s2=mk(s.start2);
      if(e1&&s2){
        if(s2<=e1) s2.setDate(s2.getDate()+1);
        if(now>e1 && now<s2) return {visible:true,state:'split_break'};
      }
      return {visible:false,state:'outside'};
    }
    // Provisional DD split or actual no-return: use currently known outer times.
    return {visible:inInterval(sh.start,sh.end),state:inInterval(sh.start,sh.end)?'working':'outside'};
  }

  return {visible:inInterval(sh.start,sh.end),state:inInterval(sh.start,sh.end)?'working':'outside'};
}

function currentLiveShift(){
  const today=localDateIso();
  return shifts.filter(sh=>sh.date===today).find(sh=>shiftLiveState(sh).visible)||null;
}
function closeLiveQuickMenu(){
  $('liveQuickMenu')?.classList.add('hidden');
  $('liveQuickMenu')?.setAttribute('aria-hidden','true');
  $('liveQuickFab')?.setAttribute('aria-expanded','false');
}
function liveQuickAction(kind,shiftId,tripId=''){
  closeLiveQuickMenu();
  if(kind==='trip') openTripModal(shiftId);
  else if(kind==='finish') finishActiveTripNow(shiftId,tripId);
  else if(kind==='report') openReportModal(shiftId);
  else if(kind==='approval') openApprovalModal(shiftId);
}
function refreshLiveQuickActions(){
  const wrap=$('liveQuickFabWrap'),menu=$('liveQuickMenu'); if(!wrap||!menu)return;
  const sh=currentLiveShift();
  if(!sh){wrap.classList.add('hidden');closeLiveQuickMenu();return;}
  wrap.classList.remove('hidden');
  const active=activeTripForShift(sh), nextPlanned=nextUnstartedPlannedTrip(sh);
  menu.innerHTML=`
    <button type="button" onclick="${active?`liveQuickAction('finish','${sh.id}','${active.id}')`:nextPlanned?`startPlannedTripNow('${sh.id}','${nextPlanned.id}');closeLiveQuickMenu()`:`liveQuickAction('trip','${sh.id}')`}">${materialIcon('trip')}<span>${active?'סיים סיבוב':nextPlanned?`התחל ${nextPlanned.plannedStart}`:'התחל סיבוב'}</span></button>
    <button type="button" onclick="liveQuickAction('report','${sh.id}')">${materialIcon('report')}<span>דוח</span></button>
    <button type="button" onclick="liveQuickAction('approval','${sh.id}')">${materialIcon('approval')}<span>אישור / שינוי</span></button>`;
}
function toggleLiveQuickMenu(){
  refreshLiveQuickActions();
  const menu=$('liveQuickMenu'),fab=$('liveQuickFab');
  if(!menu||$('liveQuickFabWrap')?.classList.contains('hidden'))return;
  const open=menu.classList.contains('hidden');
  menu.classList.toggle('hidden',!open);menu.setAttribute('aria-hidden',open?'false':'true');
  fab?.setAttribute('aria-expanded',open?'true':'false');
}
window.liveQuickAction=liveQuickAction;
function liveShiftPanelHtml(sh){
  const live=shiftLiveState(sh);
  if(!live.visible) return '';

  const active=activeTripForShift(sh);
  const m=shiftOperationalMetrics(sh,{live:true});
  const statusText=live.state==='split_break'?'בהפסקת פיצול':'במשמרת';

  return `<div class="live-shift-panel">
    <div class="live-shift-head"><strong><span class="live-dot"></span>סטטוס משמרת חי</strong><span class="filter-count">${escapeHtml(localTimeHm())}</span></div>
    <div class="today-status" style="margin-bottom:9px">${statusText}</div>
    <div class="live-shift-grid">
      <div class="live-stat"><span>זמן במשמרת עד עכשיו</span><strong>${fmtMin(m.baseWork)}</strong></div>
      <div class="live-stat"><span>סיבובים</span><strong>${normalizedTrips(sh).length}</strong></div>
      <div class="live-stat"><span>נהיגה מתועדת</span><strong>${fmtMin(m.driving)}</strong></div>
      <div class="live-stat"><span>הפסקות</span><strong>${m.breaksKnown?fmtMin(m.breakMinutes):'לא ידוע'}</strong></div>
    </div>
    ${active?`<div class="active-trip-card">
      <div class="active-trip-title">● סיבוב פעיל · ${escapeHtml(active.startPoint||'')}</div>
      <div class="active-trip-meta">התחיל ${escapeHtml(active.startTime||'—')} · זמן שחלף ${fmtMin(tripElapsedMinutes(sh,active))}${active.rb?` · ${escapeHtml(active.rb)}`:''}${active.trainNumber?` · רכבת ${escapeHtml(active.trainNumber)}`:''}</div>
      <div class="active-trip-actions">
        <button type="button" class="primary" onclick="finishActiveTripNow('${sh.id}','${active.id}')">⏹ סיום סיבוב עכשיו</button>
        <button type="button" class="secondary" onclick="openTripModal('${sh.id}','${active.id}')">✏️ עריכה</button>
      </div>
    </div>`:`<div class="active-trip-card">
      <div class="active-trip-title">אין סיבוב פעיל כרגע</div>
      <div class="active-trip-meta">${live.state==='split_break'?'אתה כרגע בהפסקת פיצול.':'אפשר להתחיל את החצי סיבוב הבא בלחיצה אחת.'}</div>
      ${nextUnstartedPlannedTrip(sh)?`<button type="button" class="primary" style="width:100%" onclick="startPlannedTripNow('${sh.id}','${nextUnstartedPlannedTrip(sh).id}')">▶ התחל סיבוב מתוכנן ${escapeHtml(nextUnstartedPlannedTrip(sh).plannedStart)}</button>`:`<button type="button" class="primary" style="width:100%" onclick="openTripModal('${sh.id}')">▶ התחל סיבוב</button>`}
    </div>`}
  </div>`;
}

function quickActionsHtml(sh){
  return `<div class="shift-quick-actions">
    <button type="button" class="primary" onclick="openTripModal('${sh.id}')">${materialIcon("trip")}<span>סיבוב</span></button>
    <button type="button" class="primary" onclick="openReportModal('${sh.id}')">${materialIcon("report")}<span>דוח</span></button>
    <button type="button" class="secondary" onclick="openApprovalModal('${sh.id}')">${materialIcon("approval")}<span>אישור / שינוי</span></button>
  </div>`;
}
function shiftTimelineHtml(sh){
  const c=calcShift(sh), items=[];
  const push=(time,title,meta='',kind='event',onclick='')=>{
    if(!time) return;
    items.push({time,title,meta,kind,onclick,sort:timelineSortMinute(time,sh.start)});
  };

  if(sh.dayType==='split' && !c.provisional){
    push(sh.start,'כניסה 1','תחילת החלק הראשון','start');
    push(sh.splitEnd1||sh.end,'יציאה 1','סיום החלק הראשון','end');
    if(c.splitReturned){
      const gapMeta=`הפסקת פיצול ${fmtMin(c.splitGapMinutes)}${c.splitGapOk?'':' · פחות מ־3 שעות — לבדוק מול הסדרן'}`;
      push(sh.splitEnd1||sh.end,'הפסקת פיצול',gapMeta,c.splitGapOk?'gap':'warning');
      push(sh.splitStart2,'כניסה 2','חזרה לחלק השני','start');
      push(sh.splitEnd2,'יציאה 2',`סיום המשמרת · +1:00 שעת פיצול לתשלום`,'end');
    }else if(c.didNotReturn){
      push(sh.splitEnd1||sh.end,'סיום בפועל','לא חזר לחלק השני · ללא תוספת שעת פיצול','end');
    }
  }else{
    push(sh.start,sh.dayType==='split'?'תחילת DD':'תחילת משמרת',c.provisional?'שעות הפיצול טרם עודכנו — חישוב זמני לפי DD':'','start');
    push(sh.end,sh.dayType==='split'?'סוף DD מתוכנן':'סיום משמרת',c.provisional?'יש לעדכן את שעות הפיצול ביום המשמרת':'','end');
  }

  normalizedTrips(sh).slice().sort((a,b)=>timelineSortMinute(a.plannedStart||a.startTime,sh.start)-timelineSortMinute(b.plannedStart||b.startTime,sh.start)).forEach((t,i)=>{
    const active=!!(t.active&&!t.endTime), time=t.startTime||t.plannedStart;
    const plan=t.plannedStart?`מתוכנן ${t.plannedStart}–${t.plannedEnd}`:'';
    const actual=t.startTime?(active?`התחיל בפועל ${t.startTime}`:`בפועל ${t.startTime}–${t.endTime||'—'}`):'טרם התחיל';
    const meta=[isEmptyTrip(t)?'ריק / חזרה לדיפו':'נסיעה מסחרית',[t.startPoint,t.endPoint].filter(Boolean).join(' ← '),plan,actual,t.rb||t.plannedRb||'',t.trainNumber?`רכבת ${t.trainNumber}`:'',tripTimingText(t,sh)].filter(Boolean).join(' · ');
    push(time,`${isEmptyTrip(t)?'נסיעה ריקה':'סיבוב'} ${i+1}${active?' · פעיל':''}`,meta,isEmptyTrip(t)?'empty':'commercial',`openTripModal('${sh.id}','${t.id}')`);
  });
  normalizedPlannedEvents(sh).forEach(e=>{
    const x=effectivePlannedEvent(sh,e);
    const moved=x.delayMinutes?` · הוזז ${x.delayMinutes>0?'+':''}${x.delayMinutes} דק׳ בעקבות סיום הנסיעה בפועל`:'';
    push(x.effectiveStart,e.type,`${x.effectiveStart}–${x.effectiveEnd}${moved}`,'event','');
  });
  const breakInfo=shiftBreakInfo(sh);
  if(breakInfo.known){
    breakInfo.gaps.forEach(g=>push(g.time,g.afterScan?'הפסקה אחרי סריקה':'הפסקה בין סיבובים',`${fmtMin(g.minutes)} · עד ${g.endTime}`,'gap'));
  }
  normalizedReports(sh).forEach(r=>{
    const trip=r.tripId&&tripById(sh,r.tripId);
    const meta=[r.type||'דוח נהג',trip?tripLabel(trip):'',r.description||''].filter(Boolean).join(' · ');
    push(r.eventTime,'דוח נהג',meta,'report',`openReportModal('${sh.id}','${r.id}')`);
  });
  normalizedApprovals(sh).forEach(a=>{
    const time=timelineClockFromIso(a.createdAt);
    const meta=[a.what||'',a.approvedBy?`באישור ${a.approvedBy}`:'',a.note||''].filter(Boolean).join(' · ');
    push(time,'אישור / שינוי',meta,'approval',`openApprovalModal('${sh.id}','${a.id}')`);
  });

  items.sort((a,b)=>a.sort-b.sort || a.title.localeCompare(b.title,'he'));
  if(!items.length) return `<p class="note" style="margin:8px 0 0">אין עדיין אירועים להצגה בציר הזמן.</p>`;
  return `<div class="shift-timeline">${items.map(x=>`<div class="timeline-item ${x.kind==='commercial'?'timeline-commercial':''} ${x.kind==='empty'?'timeline-empty':''} ${x.kind==='event'?'timeline-event':''} ${x.kind==='gap'?'timeline-gap':''} ${x.kind==='warning'?'timeline-warning':''}">
    <span class="timeline-dot"></span>
    <div class="timeline-time">${escapeHtml(x.time)}</div>
    <div class="timeline-card ${x.onclick?'clickable':''}" ${x.onclick?`onclick="${x.onclick}" role="button" tabindex="0"`:''}>
      <div class="timeline-title">${escapeHtml(x.title)}</div>
      ${x.meta?`<div class="timeline-meta">${escapeHtml(x.meta)}</div>`:''}
    </div>
  </div>`).join('')}</div>`;
}

function shiftRouteEndpoints(sh){
  const trips=normalizedTrips(sh).filter(t=>t && (t.startPoint||t.endPoint));
  if(!trips.length) return {start:'',end:''};
  const sorted=trips.slice().sort((a,b)=>{
    const at=a.plannedStart||a.startTime||'';
    const bt=b.plannedStart||b.startTime||'';
    return timelineSortMinute(at,sh.start)-timelineSortMinute(bt,sh.start);
  });
  const first=sorted.find(t=>t.startPoint)||sorted[0];
  const last=[...sorted].reverse().find(t=>t.endPoint)||sorted[sorted.length-1];
  return {start:first?.startPoint||'',end:last?.endPoint||''};
}

function openShiftDetails(id,{historyMode='push'}={}){
  const sh=shifts.find(x=>x.id===id);
  if(!sh) return;
  const c=calcShift(sh);
  const breakInfo=shiftBreakInfo(sh);
  const routeEndpoints=shiftRouteEndpoints(sh);
  const dayLabel=sh.dayType==='split'?'פיצול':({regular:'רגיל',friday:'שישי',saturday:'שבת',holiday:'חג'}[c.type]||'');
  const isSaturday=c.type==='saturday';
  const ddText=(sh.ddType && sh.ddNumber!=='')?displayShiftDd(sh):lineLabel(shiftLine(sh));
  const hourParts=[];
  if(!isSaturday && c.regMin>0) hourParts.push(`רגיל ${fmtMin(c.regMin)}`);
  if(isSaturday && c.grossMinutes>0) hourParts.push(`שבת 225% ${fmtMin(c.grossMinutes)}`);
  if(c.ot1Min>0) hourParts.push(`125% ${fmtMin(c.ot1Min)}`);
  if(c.ot2Min>0) hourParts.push(`150% ${fmtMin(c.ot2Min)}`);
  if(c.nightMin>0) hourParts.push(`לילה ${fmtMin(c.nightMin)}`);

  const payParts=[];
  if(!isSaturday && (c.regPay||0)>0) payParts.push(`רגיל ${detailMoney(c.regPay)}`);
  if(isSaturday && (c.regPay||0)>0) payParts.push(`שבת ${detailMoney(c.regPay)}`);
  if((c.ot1Pay||0)>0) payParts.push(`125% ${detailMoney(c.ot1Pay)}`);
  if((c.ot2Pay||0)>0) payParts.push(`150% ${detailMoney(c.ot2Pay)}`);
  if((c.nightExtra||0)>0) payParts.push(`לילה ${detailMoney(c.nightExtra)}`);

  $('shiftDetailsPageTitle').textContent=`${formatDateHe(sh.date)} · ${ddText}`;
  $('shiftDetailsPageContent').innerHTML=`
    <div class="shift-page-hero">
      <div class="shift-page-hero-main">
        <span>${escapeHtml(lineLabel(shiftLine(sh)))} · ${escapeHtml(dayLabel)}</span>
        <strong>${escapeHtml(ddText)}</strong>
        <small>${escapeHtml(formatDateHe(sh.date))}</small>
      </div>
      <div class="shift-page-hero-time">${escapeHtml(sh.start||'—')}–${escapeHtml(sh.end||'—')}</div>
      ${(routeEndpoints.start||routeEndpoints.end)?`<div class="shift-page-route"><span>מתחיל: <strong>${escapeHtml(routeEndpoints.start||'—')}</strong></span><span>מסיים: <strong>${escapeHtml(routeEndpoints.end||'—')}</strong></span></div>`:''}
    </div>
    <div class="shift-detail-cards">
      <div class="shift-detail-card summary-tile">
        <div class="shift-detail-card-title">שעות</div>
        <div class="shift-detail-card-main">${sh.dayType==='split'
          ? `${escapeHtml(sh.start||'—')}–${escapeHtml(sh.splitEnd1||sh.end||'—')}${sh.splitStart2&&sh.splitEnd2?` · ${escapeHtml(sh.splitStart2)}–${escapeHtml(sh.splitEnd2)}`:''}`
          : `${escapeHtml(sh.start)}–${escapeHtml(sh.end)}`}</div>
        <div class="shift-detail-card-sub">${c.isSplit?`עבודה בפועל ${fmtMin(c.workedMinutes)} · לתשלום ${fmtMin(c.grossMinutes)}`:`${fmtMin(c.grossMinutes)}`} · ${escapeHtml(dayLabel)} · ${escapeHtml(ddText)}</div>
        ${c.splitBonusMinutes?`<div class="shift-detail-card-sub">כולל תוספת שעת פיצול: +1:00</div>`:''}
        ${c.isSplit&&c.provisional?`<div class="shift-detail-card-sub">חישוב זמני לפי שעות ה־DD — שעות הפיצול טרם עודכנו</div>`:''}
        ${c.isSplit&&c.didNotReturn?`<div class="shift-detail-card-sub">לא חזר לחלק השני — ללא תוספת שעה</div>`:''}
        ${c.isSplit&&c.splitReturned?`<div class="${c.splitGapOk?'shift-detail-card-sub':'split-detail-warning'}">הפסקת פיצול ${fmtMin(c.splitGapMinutes)}${c.splitGapOk?' ✓':' · פחות מ־3 שעות — לבדוק מול הסדרן'}</div>`:''}
        ${hourParts.length?`<div class="shift-detail-card-sub">${hourParts.map(escapeHtml).join(' · ')}</div>`:''}
      </div>

      <div class="shift-detail-card summary-tile">
        <div class="shift-detail-card-title">שכר</div>
        <div class="shift-detail-card-main">${detailMoney(c.pay||0)}</div>
        <div class="shift-detail-card-sub">שכר צפוי למשמרת</div>
        ${payParts.length?`<div class="shift-detail-card-sub">${payParts.map(escapeHtml).join(' · ')}</div>`:''}
        ${(c.travel||0)>0?`<div class="shift-detail-mini"><span>נסיעות</span><strong>${detailMoney(c.travel)}</strong></div>`:''}
        ${(c.perDiem||0)>0?`<div class="shift-detail-mini"><span>אש"ל</span><strong>${detailMoney(c.perDiem)}</strong></div>`:''}
        ${(c.specialPay||0)>0?`<div class="shift-detail-mini"><span>תוספות</span><strong>${detailMoney(c.specialPay)}</strong></div>`:''}
        ${(c.bonus||0)>0?`<div class="shift-detail-mini"><span>ידני</span><strong>${detailMoney(c.bonus)}</strong></div>`:''}
      </div>
      <div class="shift-detail-wide">
        <div class="break-summary"><span>זמן הפסקות בין סיבובים</span><strong>${breakInfo.known?fmtMin(breakInfo.minutes):'לא ידוע'}</strong></div>
        ${operationalMetricsHtml(sh)}
      </div>
    </div>

    <div class="shift-details-section">
      <div class="shift-head" style="margin-bottom:8px"><h3 style="margin:0">מה קרה במשמרת</h3><span class="filter-count">ציר זמן</span></div>
      ${shiftTimelineHtml(sh)}
    </div>

    ${sh.notes?`
      <div class="shift-details-section">
        <div class="shift-detail-card-title">הערות משמרת</div>
        <div class="report-text">${escapeHtml(sh.notes)}</div>
      </div>`:''}

    <div class="shift-page-main-actions">
      <button type="button" class="secondary" onclick="editShiftFromDetails('${sh.id}')">עריכת משמרת</button>
      <button type="button" class="secondary" onclick="exportShiftPdf('${sh.id}')">PDF משמרת</button>
    </div>

    <div class="shift-details-section">
      <div class="shift-head" style="margin-bottom:8px"><h3 style="margin:0">נסיעות / חצאי סיבוב</h3><span class="filter-count">${normalizedTrips(sh).length} נסיעות</span></div>
      ${tripsHtmlForShift(sh)}
      <div class="detail-actions" style="margin-top:12px"><button type="button" class="primary" onclick="openTripModal('${sh.id}')">${materialIcon("add")}<span>התחל סיבוב</span></button></div>
    </div>

    <div class="shift-details-section">
      <div class="shift-head" style="margin-bottom:8px">
        <h3 style="margin:0">אישורים ושינויים במשמרת</h3>
        <span class="filter-count">${normalizedApprovals(sh).length} רישומים</span>
      </div>
      ${approvalsHtmlForShift(sh)}
      <div class="detail-actions" style="margin-top:12px">
        <button type="button" class="secondary" onclick="openApprovalModal('${sh.id}')">${materialIcon("add")}<span>הוסף</span> אישור / שינוי</button>
      </div>
    </div>

    <div class="shift-details-section">
      <div class="shift-head" style="margin-bottom:8px">
        <h3 style="margin:0">דוחות נהג</h3>
        <span class="filter-count">${normalizedReports(sh).length} דוחות</span>
      </div>
      ${reportsHtmlForShift(sh)}
      <div class="detail-actions" style="margin-top:12px">
        <button type="button" class="primary" onclick="openReportModal('${sh.id}')">${materialIcon("report")}<span>הוסף דוח</span></button>
      </div>
    </div>

    <div class="shift-danger-zone">
      <div class="shift-danger-zone-title">מחיקת משמרת</div>
      <p>מחיקת המשמרת תמחק גם את הסיבובים, הדוחות והאישורים ששמורים בתוכה.</p>
      <button type="button" class="danger shift-delete-button" onclick="deleteShiftFromDetails('${sh.id}')">מחיקת המשמרת</button>
    </div>
  `;

  currentShiftDetailsId=id;
  showAppTab('shiftDetailsPage',{remember:false,historyMode,shiftId:id});
  window.scrollTo({top:0,behavior:'instant'});
}
function exportShiftPdf(id){
  const sh=shifts.find(x=>x.id===id); if(!sh) return;
  const c=calcShift(sh), bi=shiftBreakInfo(sh), om=shiftOperationalMetrics(sh);
  const trips=normalizedTrips(sh), reports=normalizedReports(sh), approvals=normalizedApprovals(sh);
  const dayLabel=sh.dayType==='split'?'פיצול':({regular:'רגיל',friday:'שישי',saturday:'שבת',holiday:'חג'}[c.type]||'');
  const dd=(sh.ddType&&sh.ddNumber!=='')?displayShiftDd(sh):lineLabel(shiftLine(sh));
  const intervals=sh.dayType==='split' ? `${escapeHtml(sh.start||'—')}–${escapeHtml(sh.splitEnd1||sh.end||'—')}${sh.splitStart2&&sh.splitEnd2?` · ${escapeHtml(sh.splitStart2)}–${escapeHtml(sh.splitEnd2)}`:''}` : `${escapeHtml(sh.start||'—')}–${escapeHtml(sh.end||'—')}`;
  const timeline=shiftTimelineHtml(sh).replace(/ onclick="[^"]*"/g,'').replace(/ role="button"/g,'').replace(/ tabindex="0"/g,'');
  const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>משמרת ${escapeHtml(formatDateHe(sh.date))}</title><style>
  @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,"Segoe UI",sans-serif;color:#111;direction:rtl;font-size:12px;margin:0}h1{font-size:22px;margin:0 0 4px}.sub{color:#555;margin-bottom:14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.box,.section{border:1px solid #d8dbe2;border-radius:10px;padding:11px}.big{font-size:20px;font-weight:700;margin:4px 0}.section{margin-top:12px}.section h2{font-size:15px;margin:0 0 8px}.row{padding:6px 0;border-bottom:1px solid #eee}.row:last-child{border:0}.muted{color:#666;font-size:11px}.shift-timeline{position:relative;padding-right:26px}.shift-timeline:before{content:"";position:absolute;right:8px;top:10px;bottom:10px;width:2px;background:#ddd}.timeline-item{position:relative;display:grid;grid-template-columns:48px 1fr;gap:8px;padding:5px 0}.timeline-dot{position:absolute;right:-22px;top:10px;width:10px;height:10px;border-radius:50%;background:white;border:3px solid #444}.timeline-time{font-weight:700;direction:ltr;text-align:right}.timeline-card{border:1px solid #ddd;border-radius:8px;padding:7px}.timeline-title{font-weight:700}.timeline-meta{font-size:10px;color:#666;margin-top:2px}@media print{button{display:none!important}}
  </style></head><body><h1>דוח משמרת</h1><div class="sub">${escapeHtml(formatDateHe(sh.date))} · ${escapeHtml(dayNameHe(sh.date))} · ${escapeHtml(dd)} · ${escapeHtml(dayLabel)}</div>
  <div class="grid"><div class="box"><b>שעות</b><div class="big">${intervals}</div><div>עבודה/לתשלום: ${fmtMin(c.workedMinutes??c.grossMinutes)} / ${fmtMin(c.grossMinutes)}</div><div>נהיגה מתועדת: <b>${fmtMin(om.driving)}</b></div><div>הפסקות בין סיבובים: <b>${bi.known?fmtMin(bi.minutes):'לא ידוע'}</b></div><div>זמן לא מתועד: <b>${om.undocumented===null?'לא ידוע':fmtMin(om.undocumented)}</b></div>${c.splitBonusMinutes?`<div>תוספת שעת פיצול: +1:00</div>`:''}</div><div class="box"><b>שכר צפוי</b><div class="big">${detailMoney(c.pay)}</div><div>נסיעות ${detailMoney(c.travel)} · אש״ל ${detailMoney(c.perDiem)}</div></div></div>
  <div class="section"><h2>ציר זמן המשמרת</h2>${timeline}</div>
  <div class="section"><h2>נסיעות / חצאי סיבוב (${trips.length})</h2>${trips.length?trips.map((t,i)=>`<div class="row"><b>חצי סיבוב ${i+1} · ${escapeHtml(t.startPoint||'')}</b><div class="muted">${escapeHtml(t.startTime||'—')}–${escapeHtml(t.endTime||'—')}${t.rb?` · RB ${escapeHtml(t.rb)}`:''}${t.trainNumber?` · רכבת ${escapeHtml(t.trainNumber)}`:''} · ${escapeHtml(tripTimingText(t,sh))}</div></div>`).join(''):'<div class="muted">אין סיבובים מתועדים.</div>'}</div>
  <div class="section"><h2>אישורים ושינויים (${approvals.length})</h2>${approvals.length?approvals.map(a=>`<div class="row"><b>${escapeHtml(a.what||'')}</b><div class="muted">${a.approvedBy?`באישור ${escapeHtml(a.approvedBy)}`:''}${a.note?` · ${escapeHtml(a.note)}`:''}</div></div>`).join(''):'<div class="muted">אין רישומים.</div>'}</div>
  <div class="section"><h2>דוחות נהג (${reports.length})</h2>${reports.length?reports.map(r=>`<div class="row"><b>${escapeHtml(r.eventTime||'—')} · ${escapeHtml(r.type||'דוח')}</b><div>${escapeHtml(r.description||'')}</div></div>`).join(''):'<div class="muted">אין דוחות.</div>'}</div>
  ${sh.notes?`<div class="section"><h2>הערות</h2>${escapeHtml(sh.notes)}</div>`:''}<script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script>


</body></html>`;
  const w=window.open('','_blank'); if(!w){alert('הדפדפן חסם את חלון ה-PDF. יש לאפשר חלונות קופצים ולנסות שוב.');return;} w.document.open();w.document.write(html);w.document.close();
}
window.exportShiftPdf=exportShiftPdf;


let currentShiftDetailsId=null;

function closeShiftDetails(){
  if(!$('shiftDetailsPage')?.classList.contains('hidden')){
    if(history.length>1){
      history.back();
    }else{
      showAppTab('shifts',{remember:true,historyMode:'pop'});
    }
    return;
  }
  $('shiftDetailsModal')?.classList.add('hidden');
  $('shiftDetailsModal')?.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}

window.openShiftDetails=openShiftDetails;

window.editShiftFromDetails=id=>{
  window.editShift(id);
};

window.editShift=id=>{
  const sh=shifts.find(x=>x.id===id);
  if(!sh) return;
  editingShiftId=id;
  $('date').value=sh.date||'';
  $('start').value=sh.start||'';
  $('end').value=sh.dayType==='split'?(sh.splitEnd1||sh.end||''):(sh.end||'');
  $('splitStart2').value=sh.splitStart2||'';
  $('splitEnd2').value=sh.splitEnd2||'';
  if($('splitDidNotReturn')) $('splitDidNotReturn').checked=!!sh.splitDidNotReturn;
  $('breakMin').value=sh.breakMin||0;
  $('notes').value=sh.notes||'';
  $('dayType').value=sh.dayType||'auto';
  updateSplitShiftUi();
  $('bonus').value=sh.bonus||0;
  $('extraLoopType').value=sh.extraLoopType||'none';
  $('nightLineType').value=sh.nightLineType||'none';
  if($('shiftLine')) $('shiftLine').value=shiftLine(sh);
  setTimeout(()=>{
    refreshDdPresetOptions();
    const savedDd=(sh.ddType && sh.ddNumber!=='') ? ddKey(sh.ddType,sh.ddNumber) : '';
    if($('ddPreset')) $('ddPreset').value=savedDd;
  },0);
  $('addShift').textContent='שמור שינויים';
  openShiftModal(true);
};

function shiftDeleteLabel(sh){
  const dd=(sh.ddType&&sh.ddNumber!=='')?` · ${displayShiftDd(sh)}`:'';
  return `${formatDateHe(sh.date)}${dd} · ${sh.start||'—'}–${sh.end||'—'}`;
}

window.deleteShift=(id,{skipConfirm=false}={})=>{
  const sh=shifts.find(x=>x.id===id);
  if(!sh) return false;
  if(!skipConfirm && !confirm(`בטוח למחוק את המשמרת ${shiftDeleteLabel(sh)}?\n\nהפעולה תמחק גם סיבובים, דוחות ואישורים ששמורים במשמרת.`)) return false;

  selectedShiftIds.delete(id);
  shifts=shifts.filter(x=>x.id!==id);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  window.dispatchEvent(new CustomEvent('salary-shift-changed',{
    detail:{action:'delete',shiftId:id}
  }));
  renderShifts(); renderSummary(); renderTodayDashboard();
  if(typeof renderPayslipComparison==='function') renderPayslipComparison();
  return true;
};

window.deleteShiftFromDetails=id=>{
  const sh=shifts.find(x=>x.id===id);
  if(!sh) return;
  const ok=window.deleteShift(id);
  if(!ok) return;
  currentShiftDetailsId=null;
  if(history.state?.salaryAppTab==='shiftDetailsPage' && history.length>1){
    history.back();
  }else{
    showAppTab('shifts',{remember:true,historyMode:'pop'});
  }
};

let payslips={};
try{
  payslips=JSON.parse(localStorage.getItem(KEY_PAYSLIPS)||'{}') || {};
}catch(e){
  payslips={};
}

function monthlyPayrollTotals(month){
  const filtered=month?shifts.filter(s=>s.date.startsWith(month)):shifts;
  const travelInfo=monthlyTravelForShifts(filtered);
  const t={
    regMin:0,ot125Min:0,ot150Min:0,saturdayMin:0,nightMin:0,
    travel:travelInfo.paid,perDiem:0,specialPay:0,bonus:0,gross:0
  };
  filtered.forEach(sh=>{
    const c=calcShift(sh);
    if(c.type==='saturday') t.saturdayMin+=c.grossMinutes;
    else t.regMin+=c.regMin||0;
    t.ot125Min+=c.ot1Min||0;
    t.ot150Min+=c.ot2Min||0;
    t.nightMin+=c.nightMin||0;
    t.perDiem+=c.perDiem||0;
    t.specialPay+=c.specialPay||0;
    t.bonus+=c.bonus||0;
    t.gross+=(c.pay||0)-(c.travel||0);
  });
  t.gross+=travelInfo.paid;
  return t;
}

const payslipFields=[
  {key:'regHours',label:'שעות רגילות',type:'hours',app:t=>t.regMin/60},
  {key:'ot125Hours',label:'שעות 125%',type:'hours',app:t=>t.ot125Min/60},
  {key:'ot150Hours',label:'שעות 150%',type:'hours',app:t=>t.ot150Min/60},
  {key:'saturdayHours',label:'שבת 225%',type:'hours',app:t=>t.saturdayMin/60},
  {key:'nightHours',label:'שעות לילה',type:'hours',app:t=>t.nightMin/60},
  {key:'travel',label:'נסיעות',type:'money',app:t=>t.travel},
  {key:'perDiem',label:'אש"ל',type:'money',app:t=>t.perDiem},
  {key:'specialPay',label:'תוספות מיוחדות',type:'money',app:t=>t.specialPay},
  {key:'bonus',label:'תוספות ידניות',type:'money',app:t=>t.bonus},
  {key:'gross',label:'ברוטו',type:'money',app:t=>t.gross}
];

function formatCompareValue(v,type){
  if(type==='money') return currency(v);
  return `${Number(v||0).toFixed(2)} ש׳`;
}
function formatDiff(v,type){
  if(type==='money') return `${v>0?'+':''}${currency(v)}`;
  return `${v>0?'+':''}${Number(v||0).toFixed(2)} ש׳`;
}

function renderPayslipComparison(){
  const month=$('payslipMonth').value;
  const app=monthlyPayrollTotals(month);
  const saved=payslips[month]||{};
  let compared=0, mismatches=0, totalMoneyDiff=0;

  $('payslipCompareBody').innerHTML=payslipFields.map(f=>{
    const appValue=Number(f.app(app)||0);
    const raw=saved[f.key];
    const hasValue=raw!==undefined && raw!==null && raw!=='';
    const slipValue=hasValue?Number(raw):null;
    const diff=hasValue ? slipValue-appValue : null;
    if(hasValue){
      compared++;
      if(Math.abs(diff)>.009) mismatches++;
      if(f.type==='money') totalMoneyDiff+=diff;
    }
    const cls=diff===null?'':(Math.abs(diff)<.01?'diff-ok':(diff<0?'diff-bad':'diff-more'));
    return `<tr>
      <td>${f.label}</td>
      <td>${formatCompareValue(appValue,f.type)}</td>
      <td><input class="payslip-input" data-key="${f.key}" type="number" step="${f.type==='money'?'0.01':'0.01'}" value="${hasValue?escapeHtml(raw):''}" placeholder="לפי התלוש"></td>
      <td class="${cls}">${diff===null?'—':(Math.abs(diff)<.01?'תואם ✓':formatDiff(diff,f.type))}</td>
    </tr>`;
  }).join('');

  if(compared===0){
    $('payslipStatus').textContent='טרם הוזן תלוש';
    $('payslipCompareSummary').innerHTML='<div class="muted">הזן את נתוני התלוש ולחץ "שמור נתוני תלוש".</div>';
  }else{
    $('payslipStatus').textContent=mismatches===0?'הכול תואם':`${mismatches} הפרשים`;
    $('payslipCompareSummary').innerHTML=`
      <div class="compare-summary-grid">
        <div class="compare-summary-box"><span>רכיבים שנבדקו</span><strong>${compared}</strong></div>
        <div class="compare-summary-box"><span>רכיבים עם הפרש</span><strong>${mismatches}</strong></div>
        <div class="compare-summary-box"><span>הפרש כספי ברכיבים שהוזנו</span><strong class="${Math.abs(totalMoneyDiff)<.01?'diff-ok':(totalMoneyDiff<0?'diff-bad':'diff-more')}">${formatDiff(totalMoneyDiff,'money')}</strong></div>
        <div class="compare-summary-box"><span>משמעות ההפרש</span><strong>${totalMoneyDiff<-.01?'פחות בתלוש':(totalMoneyDiff>.01?'יותר בתלוש':'תואם')}</strong></div>
      </div>`;
  }
}

function savePayslipData(){
  const month=$('payslipMonth').value;
  if(!month) return;
  const data={};
  document.querySelectorAll('.payslip-input').forEach(input=>{
    if(input.value!=='') data[input.dataset.key]=input.value;
  });
  payslips[month]=data;
  localStorage.setItem(KEY_PAYSLIPS,JSON.stringify(payslips));
  renderPayslipComparison();
}

const DEFAULT_TAX_2026={
  limits:[7010,10060,19000,25100,46690,60130],
  rates:[.10,.14,.20,.31,.35,.47,.50],
  creditPointValue:242
};

const DEFAULT_INSURANCE_2026={
  reducedUpTo:7703,
  maxIncome:51910,
  niLow:.0104,
  niHigh:.07,
  healthLow:.0323,
  healthHigh:.0517
};

function getCustomTaxBrackets(s){
  const limits=[
    Number(s.tax10UpTo),Number(s.tax14UpTo),Number(s.tax20UpTo),
    Number(s.tax31UpTo),Number(s.tax35UpTo),Number(s.tax47UpTo)
  ];
  const valid=limits.every((v,i)=>Number.isFinite(v) && v>0 && (i===0 || v>limits[i-1]));
  if(!valid) return null;
  return {limits,rates:[.10,.14,.20,.31,.35,.47,.50]};
}

function getTaxBrackets(s){
  return getCustomTaxBrackets(s) || DEFAULT_TAX_2026;
}

function calculateMarginalTax(gross,brackets){
  let tax=0, from=0;
  brackets.limits.forEach((to,i)=>{
    if(gross>from) tax += Math.max(0,Math.min(gross,to)-from)*brackets.rates[i];
    from=to;
  });
  if(gross>from) tax+=(gross-from)*brackets.rates[6];
  return tax;
}

function getInsuranceConfig(s){
  const vals={
    reducedUpTo:Number(s.niReducedUpTo),
    maxIncome:Number(s.niMaxIncome),
    niLow:Number(s.niLowPct)/100,
    niHigh:Number(s.niHighPct)/100,
    healthLow:Number(s.healthLowPct)/100,
    healthHigh:Number(s.healthHighPct)/100
  };
  const valid=
    Number.isFinite(vals.reducedUpTo) && vals.reducedUpTo>0 &&
    Number.isFinite(vals.maxIncome) && vals.maxIncome>vals.reducedUpTo &&
    [vals.niLow,vals.niHigh,vals.healthLow,vals.healthHigh].every(v=>Number.isFinite(v)&&v>=0);
  return valid ? {...vals,custom:true} : {...DEFAULT_INSURANCE_2026,custom:false};
}

function calculateTwoTierInsurance(gross,cfg,lowRate,highRate){
  const chargeable=Math.max(0,Math.min(gross,cfg.maxIncome));
  const lowBase=Math.min(chargeable,cfg.reducedUpTo);
  const highBase=Math.max(0,chargeable-cfg.reducedUpTo);
  return lowBase*lowRate + highBase*highRate;
}

function estimateNetDetails(gross){
  const s=getSettings();
  const pension=gross*(Number(s.pensionPct||0)/100);
  const unionDeduction=gross*(Number(s.otherDeductPct||0)/100);

  const customTax=getCustomTaxBrackets(s);
  const taxBrackets=customTax || DEFAULT_TAX_2026;
  const taxBeforeCredits=calculateMarginalTax(gross,taxBrackets);
  const creditPoints=Math.max(0,Number(s.creditPoints||0));
  const enteredPointValue=Number(s.creditPointValue);
  const creditPointValue=Number.isFinite(enteredPointValue)&&enteredPointValue>0
    ? enteredPointValue : DEFAULT_TAX_2026.creditPointValue;
  const taxCredits=creditPoints*creditPointValue;
  const tax=Math.max(0,taxBeforeCredits-taxCredits);

  const insuranceCfg=getInsuranceConfig(s);
  const nationalInsurance=calculateTwoTierInsurance(
    gross,insuranceCfg,insuranceCfg.niLow,insuranceCfg.niHigh
  );
  const healthInsurance=calculateTwoTierInsurance(
    gross,insuranceCfg,insuranceCfg.healthLow,insuranceCfg.healthHigh
  );
  const insurance=nationalInsurance+healthInsurance;

  const net=Math.max(0,gross-pension-unionDeduction-tax-nationalInsurance-healthInsurance);
  return {
    gross,tax,taxBeforeCredits,taxCredits,creditPoints,creditPointValue,
    nationalInsurance,healthInsurance,insurance,pension,unionDeduction,net,
    customTaxUsed:!!customTax,
    customInsuranceUsed:insuranceCfg.custom,
    insuranceConfig:insuranceCfg
  };
}
function estimateNet(gross){
  return estimateNetDetails(gross).net;
}
function renderSummary(){
  const month=$('monthFilter').value;
  const filtered=month?shifts.filter(s=>s.date.startsWith(month)):shifts;
  const travelInfo=monthlyTravelForShifts(filtered);
  let totals={
    grossMinutes:0,nightMin:0,weekendMin:0,pay:0,
    regPay:0,saturdayMin:0,saturdayPay:0,ot1Pay:0,ot2Pay:0,nightExtra:0,travel:0,perDiem:0,bonus:0,specialPay:0,
    halfLoopCount:0,halfLoopPay:0,fullLoopCount:0,fullLoopPay:0,
    nightTo2Count:0,nightTo2Pay:0,nightTo3Count:0,nightTo3Pay:0,
    nightOver3Count:0,nightOver3Pay:0
  };
  filtered.forEach(sh=>{
    const c=calcShift(sh);
    totals.grossMinutes+=c.grossMinutes; totals.nightMin+=c.nightMin; totals.pay+=c.pay;
    if(c.type!=='regular') totals.weekendMin+=c.grossMinutes;

    // Saturday is already paid correctly by calcShift() at 225%.
    // Separate it here only for clearer display; do not alter the payroll math.
    if(c.type==='saturday'){
      totals.saturdayMin += c.grossMinutes;
      totals.saturdayPay += c.regPay;
    }else{
      totals.regPay += c.regPay;
    }
    ['ot1Pay','ot2Pay','nightExtra','perDiem','bonus','specialPay'].forEach(k=>totals[k]+=c[k]);
    // Travel is monthly: daily rate × unique work days, capped once per month.
    totals.pay-=c.travel||0;

    if(sh.extraLoopType==='half'){
      totals.halfLoopCount++;
      totals.halfLoopPay += c.extraLoopPay;
    }
    if(sh.extraLoopType==='full'){
      totals.fullLoopCount++;
      totals.fullLoopPay += c.extraLoopPay;
    }
    if(sh.nightLineType==='to2'){
      totals.nightTo2Count++;
      totals.nightTo2Pay += c.nightLinePay;
    }
    if(sh.nightLineType==='to3'){
      totals.nightTo3Count++;
      totals.nightTo3Pay += c.nightLinePay;
    }
    if(sh.nightLineType==='over3'){
      totals.nightOver3Count++;
      totals.nightOver3Pay += c.nightLinePay;
    }
  });
  totals.travel=travelInfo.paid;
  totals.pay+=travelInfo.paid;

  $('sumHours').textContent=fmtMin(totals.grossMinutes);
  $('sumShifts').textContent=filtered.length;
  $('sumNight').textContent=fmtMin(totals.nightMin);
  $('sumWeekend').textContent=fmtMin(totals.weekendMin);
  $('gross').textContent=currency(totals.pay);

  const netDetails=estimateNetDetails(totals.pay);
  $('net').textContent=currency(netDetails.net);

  const specialItems = [
    ['חצי סיבוב', totals.halfLoopCount, totals.halfLoopPay],
    ['סיבוב', totals.fullLoopCount, totals.fullLoopPay],
    ['קווי לילה עד 02:00', totals.nightTo2Count, totals.nightTo2Pay],
    ['קווי לילה עד 03:00', totals.nightTo3Count, totals.nightTo3Pay],
    ['קווי לילה מעל 03:00', totals.nightOver3Count, totals.nightOver3Pay]
  ].filter(x=>x[1]>0);

  const specialDetails = specialItems.length
    ? specialItems.map(([name,count,amount])=>`
        <div class="payroll-row">
          <span>${name} <span class="muted">× ${count}</span></span>
          <span>${currency(amount)}</span>
        </div>`).join('')
    : `<div class="muted" style="padding:10px 0">אין תוספות מיוחדות בחודש זה.</div>`;

  const grossRows = `
    <div class="payroll-row"><span>שעות רגילות / תעריף יום</span><span>${currency(totals.regPay)}</span></div>
    ${totals.saturdayMin?`<div class="payroll-row"><span>שבת 225% <span class="muted">(${fmtMin(totals.saturdayMin)} שעות)</span></span><span>${currency(totals.saturdayPay)}</span></div>`:''}
    <div class="payroll-row"><span>שעות נוספות 125%</span><span>${currency(totals.ot1Pay)}</span></div>
    <div class="payroll-row"><span>שעות נוספות 150%</span><span>${currency(totals.ot2Pay)}</span></div>
    <div class="payroll-row"><span>תוספת לילה</span><span>${currency(totals.nightExtra)}</span></div>
    <div class="payroll-row">
      <span>נסיעות <span class="muted">(${travelInfo.workDays} ימים × ${currency(travelInfo.perDay)}${travelInfo.cap>0?`, תקרה ${currency(travelInfo.cap)}`:''})</span></span>
      <span>${currency(totals.travel)}</span>
    </div>
    <div class="payroll-row"><span>אש״ל</span><span>${currency(totals.perDiem)}</span></div>
    <div class="payroll-row"><span>תוספות מיוחדות</span><span>${currency(totals.specialPay)}</span></div>
    ${specialDetails}
    <div class="payroll-row"><span>תוספת ידנית</span><span>${currency(totals.bonus)}</span></div>
  `;

  const settings=getSettings();
  const creditPoints=Number(settings.creditPoints||0);

  $('breakdown').innerHTML = `
    <div class="payroll-flow">
      <div class="payroll-accordion">
        <button type="button" class="payroll-toggle" data-payroll-toggle="grossDetails">
          <span class="payroll-toggle-main"><span class="payroll-arrow">◀</span><strong>מרכיבי שכר ברוטו</strong></span>
          <span class="payroll-amount">${currency(totals.pay)}</span>
        </button>
        <div id="grossDetails" class="payroll-details hidden">${grossRows}</div>
      </div>

      <div class="payroll-accordion">
        <button type="button" class="payroll-toggle" data-payroll-toggle="taxDetails">
          <span class="payroll-toggle-main"><span class="payroll-arrow">◀</span><strong>ניכוי מס הכנסה</strong></span>
          <span class="payroll-amount">− ${currency(netDetails.tax)}</span>
        </button>
        <div id="taxDetails" class="payroll-details hidden">
          <div class="payroll-row"><span>מס לפני נקודות זיכוי</span><span>${currency(netDetails.taxBeforeCredits)}</span></div>
          <div class="payroll-row"><span>נקודות זיכוי</span><span>${netDetails.creditPoints} × ${currency(netDetails.creditPointValue)}</span></div>
          <div class="payroll-row"><span>זיכוי ממס</span><span>− ${currency(netDetails.taxCredits)}</span></div>
          <div class="payroll-row"><strong>מס הכנסה לאחר זיכוי</strong><strong>${currency(netDetails.tax)}</strong></div>
          <div class="note" style="padding-top:8px">${netDetails.customTaxUsed?'מדרגות מס מותאמות מההגדרות.':'מדרגות ברירת מחדל 2026.'}</div>
        </div>
      </div>

      <div class="payroll-accordion">
        <button type="button" class="payroll-toggle" data-payroll-toggle="nationalInsuranceDetails">
          <span class="payroll-toggle-main"><span class="payroll-arrow">◀</span><strong>ביטוח לאומי</strong></span>
          <span class="payroll-amount">− ${currency(netDetails.nationalInsurance)}</span>
        </button>
        <div id="nationalInsuranceDetails" class="payroll-details hidden">
          <div class="payroll-row"><span>ביטוח לאומי</span><span>${currency(netDetails.nationalInsurance)}</span></div>
          <div class="note" style="padding-top:8px">${netDetails.customInsuranceUsed?'מדרגות מותאמות מההגדרות.':'ברירת מחדל 2026.'}</div>
        </div>
      </div>

      <div class="payroll-accordion">
        <button type="button" class="payroll-toggle" data-payroll-toggle="healthInsuranceDetails">
          <span class="payroll-toggle-main"><span class="payroll-arrow">◀</span><strong>ביטוח בריאות</strong></span>
          <span class="payroll-amount">− ${currency(netDetails.healthInsurance)}</span>
        </button>
        <div id="healthInsuranceDetails" class="payroll-details hidden">
          <div class="payroll-row"><span>ביטוח בריאות</span><span>${currency(netDetails.healthInsurance)}</span></div>
          <div class="note" style="padding-top:8px">${netDetails.customInsuranceUsed?'מדרגות מותאמות מההגדרות.':'ברירת מחדל 2026.'}</div>
        </div>
      </div>

      <div class="payroll-accordion">
        <button type="button" class="payroll-toggle" data-payroll-toggle="pensionDetails">
          <span class="payroll-toggle-main"><span class="payroll-arrow">◀</span><strong>פנסיה עובד</strong></span>
          <span class="payroll-amount">− ${currency(netDetails.pension)}</span>
        </button>
        <div id="pensionDetails" class="payroll-details hidden">
          <div class="payroll-row"><span>פנסיה עובד</span><span>${currency(netDetails.pension)}</span></div>
        </div>
      </div>

      <div class="payroll-accordion">
        <button type="button" class="payroll-toggle" data-payroll-toggle="unionDetails">
          <span class="payroll-toggle-main"><span class="payroll-arrow">◀</span><strong>ניכוי ועד</strong></span>
          <span class="payroll-amount">− ${currency(netDetails.unionDeduction)}</span>
        </button>
        <div id="unionDetails" class="payroll-details hidden">
          <div class="payroll-row"><span>אחוז ניכוי</span><span>${Number(settings.otherDeductPct||0)}%</span></div>
          <div class="payroll-row"><span>סה״כ ניכוי ועד</span><span>${currency(netDetails.unionDeduction)}</span></div>
        </div>
      </div>

      <div class="payroll-net">
        <div><small>נטו משוער</small><strong>${currency(netDetails.net)}</strong></div>
        <div style="text-align:left;opacity:.8">לאחר ניכויים</div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-payroll-toggle]').forEach(btn=>{
    btn.onclick=()=>{
      const target=$(btn.dataset.payrollToggle);
      const arrow=btn.querySelector('.payroll-arrow');
      const opening=target.classList.contains('hidden');
      target.classList.toggle('hidden');
      arrow.textContent=opening?'▼':'◀';
    };
  });
}




function isOperationalTime(value){
  const m=/^(\d{1,2}):([0-5]\d)$/.exec(String(value||'').trim());
  if(!m) return false;
  const h=Number(m[1]);
  return h>=0 && h<=47;
}
function normalizeOperationalTime(value){
  const m=/^(\d{1,2}):([0-5]\d)$/.exec(String(value||'').trim());
  if(!m) return '';
  return `${String(Number(m[1])).padStart(2,'0')}:${m[2]}`;
}

function operationalDurationMinutes(startValue,endValue){
  const parse=v=>{
    const m=/^(\d{1,2}):([0-5]\d)$/.exec(String(v||'').trim());
    return m ? Number(m[1])*60+Number(m[2]) : null;
  };
  const s=parse(startValue), e=parse(endValue);
  if(s===null || e===null) return null;
  let d=e-s;
  if(d<=0) d+=1440;
  return d;
}
function ddLooksLikeSplit(tpl){
  const d=operationalDurationMinutes(tpl?.start,tpl?.end);
  return Number.isFinite(d) && d>12*60;
}

function operationalToClock(value){
  const m=/^(\d{1,2}):([0-5]\d)$/.exec(String(value||'').trim());
  if(!m) return '';
  return `${String(Number(m[1])%24).padStart(2,'0')}:${m[2]}`;
}
function normalizeDdList(list,forcedType=null){
  return (Array.isArray(list)?list:[]).map(x=>({
    type:forcedType || (String(x.type||'DD').toUpperCase()==='DDR'?'DDR':'DD'),
    number:String(x.number??'').trim(),
    start:normalizeOperationalTime(x.start),
    end:normalizeOperationalTime(x.end)
  })).filter(x=>x.number && isOperationalTime(x.start) && isOperationalTime(x.end));
}
function normalizeScheduleActivity(a={}){
  const type=String(a.type||'').trim();
  const start=normalizeOperationalTime(a.start), end=normalizeOperationalTime(a.end);
  if(!type || !start || !end) return null;
  return {type,rb:String(a.rb||''),route:String(a.route||''),start,end,from:String(a.from||''),to:String(a.to||''),duration:String(a.duration||'')};
}
function normalizeSchedules(raw={}){
  const out={};
  for(let day=0;day<=6;day++){
    const src=raw?.[String(day)]&&typeof raw[String(day)]==='object'?raw[String(day)]:{};
    out[String(day)]={};
    Object.entries(src).forEach(([number,duty])=>{
      const activities=(Array.isArray(duty?.activities)?duty.activities:[]).map(normalizeScheduleActivity).filter(Boolean);
      out[String(day)][String(number)]={start:normalizeOperationalTime(duty?.start),end:normalizeOperationalTime(duty?.end),activities};
    });
  }
  return out;
}
function normalizeLineTables(raw={},fallbackLabel=''){
  const week=normalizeDdList(raw?.week,'DD');
  const thursday=normalizeDdList(raw?.thursday,'DD');
  const days={};
  for(let day=0;day<=6;day++){
    const source=raw?.days?.[String(day)];
    days[String(day)]=normalizeDdList(Array.isArray(source)?source:(day===4?thursday:(day<=3?week:[])),'DD');
  }
  return {
    label:String(raw?.label||fallbackLabel||'').trim(),
    week,
    thursday,
    ddr:normalizeDdList(raw?.ddr,'DDR'),
    days,
    schedules:normalizeSchedules(raw?.schedules||{})
  };
}
function normalizeDdTables(data){
  const lines={};
  const sourceLines=(data?.lines && typeof data.lines==='object')?data.lines:null;

  if(sourceLines){
    Object.entries(sourceLines).forEach(([key,value])=>{
      const cleanKey=String(key||'').trim();
      if(!cleanKey) return;
      lines[cleanKey]=normalizeLineTables(value,cleanKey);
    });
  }

  // Legacy dd.json / old localStorage: top-level tables are the red line.
  if(!lines.red){
    lines.red=normalizeLineTables({
      label:'אדום',
      week:data?.week,
      thursday:data?.thursday,
      ddr:data?.ddr
    },'אדום');
  }

  if(!Object.keys(lines).length){
    lines.red=normalizeLineTables({label:'אדום'},'אדום');
  }

  const defaultLine=(data?.defaultLine && lines[data.defaultLine])?data.defaultLine:(lines.red?'red':Object.keys(lines)[0]);
  const red=lines.red||lines[defaultLine];

  return {
    defaultLine,
    lines,
    // Legacy aliases kept so backups and older code can still read the red/default tables.
    week:red?.week||[],
    thursday:red?.thursday||[],
    ddr:red?.ddr||[],
    updatedAt:data?.updatedAt||data?.updated||null,
    sourceVersion:Number(data?.sourceVersion||data?.version||0)||0
  };
}
function getDdTables(){
  try{return normalizeDdTables(JSON.parse(localStorage.getItem(KEY_DD_TABLES)||'{}'));}
  catch(e){return normalizeDdTables({});}
}
function getLineDdTables(line='red',tables=null){
  const t=tables||getDdTables();
  const key=(line && t.lines?.[line])?line:t.defaultLine;
  return t.lines?.[key] || {label:key,week:[],thursday:[],ddr:[],days:{},schedules:{}};
}
function availableLines(tables=null){
  const t=tables||getDdTables();
  return Object.keys(t.lines||{}).map(key=>({
    key,
    label:t.lines[key]?.label||key
  }));
}
function defaultLineKey(tables=null){
  const t=tables||getDdTables();
  return t.defaultLine || (t.lines?.red?'red':Object.keys(t.lines||{})[0]) || 'red';
}
function populateLineSelects(preferred={}){
  const t=getDdTables();
  const lines=availableLines(t);
  const targets=[
    ['shiftLine',preferred.shiftLine],
    ['ddEditLine',preferred.ddEditLine],
    ['monthlyEntryLine',preferred.monthlyEntryLine],
    ['shiftValueLine',preferred.shiftValueLine]
  ];
  targets.forEach(([id,wanted])=>{
    const el=$(id); if(!el) return;
    const current=wanted || el.value || defaultLineKey(t);
    el.innerHTML=lines.map(x=>`<option value="${escapeHtml(x.key)}">${escapeHtml(x.label)}</option>`).join('');
    el.value=lines.some(x=>x.key===current)?current:defaultLineKey(t);
  });
}
function saveDdTables(t){
  const normalized=normalizeDdTables(t);
  localStorage.setItem(KEY_DD_TABLES,JSON.stringify(normalized));
  populateLineSelects();
  refreshDdStatus();
  refreshDdPresetOptions();
  if(typeof renderLineOperationalSettings==='function') renderLineOperationalSettings();
}
function displayDdNumber(type,number){
  if(number===undefined || number===null || String(number)==='') return '';
  const t=String(type||'DD').toUpperCase()==='DDR'?'DDR':'DD';
  return `${t}${number}`;
}
function lineLabel(line){
  const t=getDdTables();
  return t.lines?.[line]?.label || String(line||'');
}
function shiftLine(sh){
  const line=String(sh?.line||'').trim();
  if(line) return line;
  return 'red';
}
function displayShiftDd(sh){
  const dd=(sh?.ddType&&sh?.ddNumber!=='')?displayDdNumber(sh.ddType,sh.ddNumber):'';
  const line=lineLabel(shiftLine(sh))||'אדום';
  return dd?`${line} · ${dd}`:line;
}
function ddKey(type,number){ return `${String(type||'').toUpperCase()}${String(number||'').trim()}`; }
function dayIndexForDate(dateStr){
  const p=String(dateStr||'').split('-').map(Number);
  if(p.length!==3 || !p[0] || !p[1] || !p[2]) return null;
  return new Date(Date.UTC(p[0],p[1]-1,p[2])).getUTCDay();
}
function isThursday(dateStr){ return dayIndexForDate(dateStr)===4; }
function resolveDdTemplate(dateStr,type,number,line='red'){
  const t=getLineDdTables(line), key=ddKey(type,number), normalizedType=String(type||'').toUpperCase();
  if(normalizedType==='DDR'){
    const r=t.ddr.find(x=>ddKey(x.type,x.number)===key);
    return r?{...r,sourceTable:'ddr',line}:null;
  }
  const day=dayIndexForDate(dateStr);
  const list=(day!==null && Array.isArray(t.days?.[String(day)]))?t.days[String(day)]:(isThursday(dateStr)?t.thursday:t.week);
  const found=list.find(x=>ddKey(x.type,x.number)===key);
  return found?{...found,sourceTable:`day${day}`,line}:null;
}
function resolveDdSchedule(dateStr,type,number,line='red'){
  if(String(type||'').toUpperCase()!=='DD') return null;
  const day=dayIndexForDate(dateStr);
  if(day===null) return null;
  const t=getLineDdTables(line);
  return t.schedules?.[String(day)]?.[String(number)]||null;
}
function allDdForDate(dateStr,line='red'){
  const t=getLineDdTables(line), map=new Map(), day=dayIndexForDate(dateStr);
  const list=(day!==null && Array.isArray(t.days?.[String(day)]))?t.days[String(day)]:[];
  list.forEach(x=>map.set(ddKey(x.type,x.number),{...x,sourceTable:`day${day}`,line}));
  t.ddr.forEach(x=>map.set(ddKey(x.type,x.number),{...x,sourceTable:'ddr',line}));
  return [...map.values()].sort((a,b)=>ddKey(a.type,a.number).localeCompare(ddKey(b.type,b.number),'he',{numeric:true}));
}
function makeId(prefix='id'){return crypto.randomUUID?crypto.randomUUID():`${prefix}-${Date.now()}-${Math.random()}`}
function ddPlanDayGroup(dateStr,type='DD'){
  if(String(type||'').toUpperCase()==='DDR') return 'ddr';
  const day=dayIndexForDate(dateStr);
  if(day===null) return 'unknown';
  // The current fixed weekday plan is shared Sunday-Wednesday.
  if(day>=0 && day<=3) return 'sun-wed';
  return `day-${day}`;
}
function ddPlanIdentity(dateStr,type,number,line='red'){
  if(!type || number===undefined || number===null || String(number)==='') return '';
  return [String(line||'red'),String(type||'DD').toUpperCase(),String(number),ddPlanDayGroup(dateStr,type)].join('|');
}
function shiftHasRecordedTripData(sh){
  return normalizedTrips(sh).some(t=>
    !!String(t?.startTime||'').trim() || !!String(t?.endTime||'').trim() ||
    !!String(t?.rb||'').trim() || !!String(t?.trainNumber||'').trim() || !!t?.active ||
    (t?.timingStatus && !['planned',''].includes(String(t.timingStatus)))
  );
}
function shiftHasImportantDocumentation(sh){
  return shiftHasRecordedTripData(sh) || (Array.isArray(sh?.reports)&&sh.reports.length>0) || (Array.isArray(sh?.approvals)&&sh.approvals.length>0);
}
function confirmDdPlanReplacement(oldShift,newLabel){
  if(!shiftHasRecordedTripData(oldShift)) return true;
  return confirm(`⚠️ שינוי DD יחליף את הסיבובים במשמרת\n\nבמשמרת הזו כבר קיימים סיבובים מתועדים (למשל שעות בפועל, RB או מספר רכבת).\n\nאם תמשיך, הסיבובים הקיימים יימחקו ויוחלפו בתכנון של ${newLabel}. דוחות ואישורים יישמרו, אך קישור של דוח לסיבוב ישן יוסר.\n\nלהמשיך?`);
}
function reportsWithoutOldTripLinks(reports=[]){
  return (Array.isArray(reports)?reports:[]).map(r=>r?.tripId?{...r,tripId:'',updatedAt:new Date().toISOString()}:r);
}

function snapshotDdPlan(dateStr,type,number,line='red'){
  const duty=resolveDdSchedule(dateStr,type,number,line);
  const tpl=resolveDdTemplate(dateStr,type,number,line);
  const snapshot={
    line,type:String(type||'DD').toUpperCase(),number:String(number),copiedAt:new Date().toISOString(),
    sourceDayGroup:ddPlanDayGroup(dateStr,type),
    sourceStart:duty?.start||tpl?.start||'',sourceEnd:duty?.end||tpl?.end||'',hasSchedule:!!duty
  };
  if(!duty) return {trips:[],plannedEvents:[],ddPlanSnapshot:snapshot};
  const trips=[],plannedEvents=[];
  (duty.activities||[]).forEach((a,idx)=>{
    const base={source:'dd',sourceIndex:idx,plannedStart:operationalToClock(a.start),plannedEnd:operationalToClock(a.end),plannedOperationalStart:a.start,plannedOperationalEnd:a.end,plannedRb:a.rb||'',startPoint:a.from||'',endPoint:a.to||'',route:a.route||''};
    if(a.type==='נסיעה מסחרית'||a.type==='נסיעה ריקה'){
      trips.push({id:makeId('trip'),createdAt:new Date().toISOString(),...base,tripType:a.type==='נסיעה ריקה'?'empty':'commercial',rb:'',trainNumber:'',startTime:'',endTime:'',timingStatus:'planned',varianceMinutes:0,active:false});
    }else{
      plannedEvents.push({id:makeId('event'),...base,type:a.type});
    }
  });
  return {trips,plannedEvents,ddPlanSnapshot:snapshot};
}

function ddPreviewPseudoDate(day){
  // 2026-09-06 is Sunday; only weekday selection matters for DD resolution.
  const d=new Date(Date.UTC(2026,8,6+Number(day||0)));
  return d.toISOString().slice(0,10);
}
function openDdPreview(){
  const modal=$('ddPreviewModal'); if(!modal) return;
  const lineEl=$('ddPreviewLine');
  const lines=availableLines();
  lineEl.innerHTML=lines.map(x=>`<option value="${escapeHtml(x.key)}">${escapeHtml(x.label)}</option>`).join('');
  lineEl.value=defaultLineKey();
  $('ddPreviewDay').value='0';
  refreshDdPreviewOptions();
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
}
function closeDdPreview(){const m=$('ddPreviewModal');if(m){m.classList.add('hidden');m.setAttribute('aria-hidden','true')}}
function refreshDdPreviewOptions(){
  const line=$('ddPreviewLine')?.value||defaultLineKey(), day=Number($('ddPreviewDay')?.value||0), date=ddPreviewPseudoDate(day);
  const el=$('ddPreviewSelect'); if(!el) return;
  const items=allDdForDate(date,line).filter(x=>String(x.type||'').toUpperCase()==='DD');
  el.innerHTML=items.length?items.map(x=>`<option value="${escapeHtml(String(x.number))}">DD${escapeHtml(String(x.number))} · ${escapeHtml(x.start)}–${escapeHtml(x.end)}</option>`).join(''):'<option value="">אין DD קבועים ליום זה</option>';
  renderDdPreview();
}
function renderDdPreview(){
  const box=$('ddPreviewContent'); if(!box) return;
  const line=$('ddPreviewLine')?.value||defaultLineKey(), day=Number($('ddPreviewDay')?.value||0), number=$('ddPreviewSelect')?.value||'', date=ddPreviewPseudoDate(day);
  if(!number){box.innerHTML='<div class="note">ביום הזה אין טבלת DD קבועה. שישי ושבת נשארים להזנה ידנית.</div>';return;}
  const tpl=resolveDdTemplate(date,'DD',number,line);
  const duty=resolveDdSchedule(date,'DD',number,line);
  if(!tpl){box.innerHTML='<div class="note">ה־DD לא נמצא.</div>';return;}
  const start=operationalToClock(tpl.start), end=operationalToClock(tpl.end);
  const duration=operationalDurationMinutes(tpl.start,tpl.end);
  const acts=Array.isArray(duty?.activities)?duty.activities:[];
  const trips=acts.filter(a=>a.type==='נסיעה מסחרית'||a.type==='נסיעה ריקה');
  const first=trips[0], last=trips[trips.length-1];
  const driving=trips.reduce((sum,a)=>sum+Math.max(0,operationalDurationMinutes(a.start,a.end)),0);
  const events=acts.filter(a=>a.type!=='נסיעה מסחרית'&&a.type!=='נסיעה ריקה');
  box.innerHTML=`<div class="dd-preview-hero"><small>${escapeHtml(lineLabel(line))}</small><strong>DD${escapeHtml(number)}</strong><div>${escapeHtml(start)}–${escapeHtml(end)}</div></div>
    <div class="dd-preview-stats">
      <div class="dd-preview-stat"><span>שעות עבודה</span><b>${fmtMin(duration)}</b></div>
      <div class="dd-preview-stat"><span>נהיגה מתוכננת</span><b>${duty?fmtMin(driving):'—'}</b></div>
      <div class="dd-preview-stat"><span>מתחיל</span><b>${escapeHtml(first?.from||'—')}</b></div>
      <div class="dd-preview-stat"><span>מסיים</span><b>${escapeHtml(last?.to||'—')}</b></div>
    </div>
    ${duty?`<div class="dd-preview-list">${acts.map(a=>`<div class="dd-preview-row"><b>${escapeHtml(a.type)}</b><div>${escapeHtml(operationalToClock(a.start))}–${escapeHtml(operationalToClock(a.end))}${a.from||a.to?` · ${escapeHtml(a.from||'')} → ${escapeHtml(a.to||'')}`:''}</div>${a.rb?`<small>${escapeHtml(a.rb)}</small>`:''}</div>`).join('')}</div>`:`<div class="note" style="margin-top:12px">ליום זה נשמרות כרגע שעות ה־DD בלבד, ללא סיבובים.</div>`}`;
}


function ddPreviewSelectedData(){
  const line=$('ddPreviewLine')?.value||defaultLineKey();
  const day=Number($('ddPreviewDay')?.value||0);
  const number=$('ddPreviewSelect')?.value||'';
  const date=ddPreviewPseudoDate(day);
  if(!number) return null;
  const tpl=resolveDdTemplate(date,'DD',number,line);
  if(!tpl) return null;
  return {line,day,number,date,tpl,duty:resolveDdSchedule(date,'DD',number,line)};
}
function exportDdPreviewPdf(){
  const selected=ddPreviewSelectedData();
  if(!selected){ alert('יש לבחור DD להצגה.'); return; }
  const {line,number,tpl,duty}=selected;
  const acts=Array.isArray(duty?.activities)?duty.activities:[];
  const sum=duty?.summary||tpl?.summary||{};
  const duration=sum.duration||fmtMin(operationalDurationMinutes(tpl.start,tpl.end));
  const driving=sum.driving||fmtMin(acts.filter(a=>a.type==='נסיעה מסחרית'||a.type==='נסיעה ריקה').reduce((n,a)=>n+Math.max(0,operationalDurationMinutes(a.start,a.end)),0));
  const work=sum.work||duration, paid=sum.paid||work, breakRefresh=sum.breakRefresh||'—', splitBreak=sum.splitBreak||'';
  const headerTitle=line==='yellow'?'Workdays/L3, WD, 72TTTT DD_Modai':"Special Events/PTO2 ThurdNightServ 5' 31tr 155";
  const dutyName=`DD${number}`;
  const period=sum.period||'';
  const cols=splitBreak?6:5;
  const summaryCells=[['Duration',duration],['Work Time',work],['Driving Time',driving],['Paid Time',paid],['Break and Refreshment',breakRefresh]];
  if(splitBreak) summaryCells.push(['Split Break',splitBreak]);
  const rows=acts.length?acts.map((a,i)=>`<tr class="${i%2?'shade':''}"><td class="he">${escapeHtml(a.type||'')}</td><td>${escapeHtml(a.rb||'')}</td><td>${escapeHtml(a.route||'')}</td><td><b>${escapeHtml(operationalToClock(a.start))}</b></td><td><b>${escapeHtml(operationalToClock(a.end))}</b></td><td class="he">${escapeHtml(a.from||'')}</td><td class="he">${escapeHtml(a.to||'')}</td></tr>`).join(''):`<tr><td colspan="7" style="padding:18px;text-align:center">אין סיבובים מתוכננים ליום זה</td></tr>`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(dutyName)}</title><style>
    @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,system-ui,sans-serif;color:#111;margin:0;font-size:10px;direction:ltr}.top{border:1px solid #222;background:#c8c8c8;padding:10px 9px 8px;min-height:112px;position:relative}.topline{display:grid;grid-template-columns:1fr 2fr 1fr;font-weight:700;font-size:12px}.topline .center{text-align:center}.duty{text-align:center;font-weight:700;font-size:12px;margin-top:22px}.period{position:absolute;right:18%;top:61px;font-weight:700}.weekday{font-weight:700;font-size:11px;margin-top:13px}.days{font-weight:700;font-size:11px;margin-top:10px}.summary{display:grid;grid-template-columns:repeat(${cols},1fr);border:1px solid #222;border-top:3px solid #222}.sum{padding:10px 4px;text-align:center;font-weight:700;border-left:0}.sum span{display:block;margin-bottom:5px}.sum b{font-size:10px}.times{border:1px solid #222;border-top:0;padding:9px 8px;font-weight:700;display:flex;gap:110px}.table-wrap{margin-top:0}table{width:82%;border-collapse:collapse;table-layout:fixed;font-size:9px}th,td{border:1px solid #111;padding:5px 5px;vertical-align:middle}th{background:#bdbdbd;text-align:center;font-weight:700;font-size:9px}.shade td{background:#d7dde5}.he{direction:rtl;text-align:right;font-family:Arial,system-ui,sans-serif}td:nth-child(1){width:20%}td:nth-child(2){width:8%}td:nth-child(3){width:9%}td:nth-child(4),td:nth-child(5){width:8%}td:nth-child(6),td:nth-child(7){width:23%}.footer-note{margin-top:8px;color:#555;font-size:8px}@media print{.footer-note{display:none}}
  </style></head><body>
    <div class="top"><div class="topline"><div>J-Net</div><div class="center">${escapeHtml(headerTitle)}</div><div></div></div><div class="duty">Duty Name: ${escapeHtml(dutyName)}</div>${period?`<div class="period">Period: &nbsp;&nbsp; ${escapeHtml(period)}</div>`:''}<div class="weekday">WeekDays</div><div class="days">Number of Days:</div></div>
    <div class="summary">${summaryCells.map(x=>`<div class="sum"><span>${escapeHtml(x[0])}</span><b>${escapeHtml(x[1])}</b></div>`).join('')}</div>
    <div class="times"><span>Start Time: ${escapeHtml(operationalToClock(tpl.start))}</span><span>End Time: ${escapeHtml(operationalToClock(tpl.end))}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Duty Type</th><th>RB</th><th>Route</th><th>Start</th><th>End</th><th>Departure</th><th>Arrival</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="footer-note">תצוגה של DD${escapeHtml(number)} מתוך מחברת</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script>
  </body></html>`;
  const w=window.open('','_blank');
  if(!w){alert('הדפדפן חסם את חלון ה-PDF. יש לאפשר חלונות קופצים ולנסות שוב.');return;}
  w.document.open(); w.document.write(html); w.document.close();
}
window.exportDdPreviewPdf=exportDdPreviewPdf;

function refreshDdPresetOptions(){
  const el=$('ddPreset'); if(!el) return;
  const current=el.value, items=allDdForDate($('date')?.value||'', $('shiftLine')?.value||'red');
  el.innerHTML='<option value="">בחר DD</option>'+items.map(x=>{
    const key=ddKey(x.type,x.number);
    const day=dayIndexForDate($('date')?.value||''); const src=x.sourceTable==='ddr'?'DDR':(day===4?'חמישי':day===5?'שישי':day===6?'שבת':'א׳–ד׳');
    return `<option value="${escapeHtml(key)}">${escapeHtml(key)} · ${escapeHtml(x.start)}–${escapeHtml(x.end)} · ${src}</option>`;
  }).join('');
  if([...el.options].some(o=>o.value===current)) el.value=current;
}
function applyDdPreset(key){
  if(!key) return;
  const m=/^(DDR|DD)(.+)$/i.exec(key); if(!m) return;
  const type=m[1].toUpperCase(), number=m[2];
  const tpl=resolveDdTemplate($('date').value,type,number,$('shiftLine')?.value||'red');
  if(!tpl){ alert('הסידור לא נמצא בטבלה המקומית.'); return; }

  const ddStart=operationalToClock(tpl.start);
  const ddEnd=operationalToClock(tpl.end);

  if(ddLooksLikeSplit(tpl)){
    // A DD over 12 hours is recognized as split immediately, but the user may
    // enter the real split times only on the workday. Until then the DD's own
    // start/end are kept as a provisional calculation.
    $('dayType').value='split';
    $('start').value=ddStart;
    $('end').value=ddEnd;
    $('splitStart2').value='';
    $('splitEnd2').value='';
    updateSplitShiftUi();

    const info=$('splitGapInfo');
    if(info){
      info.className='split-gap-info ok';
      info.textContent='זוהה אוטומטית כפיצול. כרגע החישוב זמני לפי שעות ה־DD; ביום המשמרת אפשר לעדכן את שעות הפיצול בפועל.';
    }
  }else{
    // Shorter DDs stay normal unless the user explicitly chose split.
    if($('dayType').value==='split'){
      $('start').value=ddStart;
      $('end').value=ddEnd;
      updateSplitShiftUi();
    }else{
      $('start').value=ddStart;
      $('end').value=ddEnd;
    }
  }
}
async function fetchDdServerPayload(){
  const r=await fetch(`${DD_SERVER_URL}?v=${Date.now()}`,{cache:'no-store'});
  if(!r.ok) throw new Error(String(r.status));
  const raw=await r.json();
  const t=normalizeDdTables(raw);
  const lines=availableLines(t);
  const total=lines.reduce((sum,x)=>{
    const lt=t.lines[x.key];
    return sum+lt.week.length+lt.thursday.length+lt.ddr.length;
  },0);
  if(!lines.length || !total) throw new Error('empty');
  return {raw,t,sourceVersion:Number(raw.version||0)||0};
}
async function updateDdFromServer(){
  const btn=$('updateDdFromServer'), old=btn.textContent;
  btn.disabled=true; btn.textContent='מוריד...';
  try{
    const {t,sourceVersion}=await fetchDdServerPayload();
    t.updatedAt=new Date().toISOString();
    t.sourceVersion=sourceVersion;
    localStorage.setItem(KEY_DD_TABLES,JSON.stringify(t));
    if(sourceVersion>0) localStorage.setItem(KEY_DD_SERVER_VERSION,String(sourceVersion));
    populateLineSelects();
    refreshDdStatus();
    refreshDdPresetOptions();
    if(typeof refreshShiftValueDdOptions==='function') refreshShiftValueDdOptions();
    closeDdUpdatePrompt();

    const rows=availableLines(t).map(x=>{
      const lt=t.lines[x.key];
      return `${x.label}: שבוע ${lt.week.length}, חמישי ${lt.thursday.length}, DDR ${lt.ddr.length}`;
    });
    alert(`טבלאות ה-DD נשמרו במכשיר מהשרת.${sourceVersion?`\nגרסה: ${sourceVersion}`:''}\n\n${rows.join('\n')}\n\nמשמרות קיימות לא השתנו.`);
    return true;
  }catch(e){
    alert('לא ניתן למשוך את טבלאות ה-DD מהשרת כרגע. העותק המקומי הקיים נשאר ללא שינוי.');
    return false;
  }finally{
    btn.disabled=false;
    btn.textContent=old;
  }
}
function downloadDdLocalCopy(){
  try{
    const t=getDdTables();
    const payload={
      version:Number(localStorage.getItem(KEY_DD_SERVER_VERSION)||t.sourceVersion||0)||0,
      exportedAt:new Date().toISOString(),
      defaultLine:t.defaultLine,
      lines:t.lines
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`salary-app-dd-copy-${localDateIso()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){
    alert('לא ניתן ליצור עותק JSON כרגע.');
  }
}

let pendingDdServerVersion=0;

function openDdUpdatePrompt(version){
  pendingDdServerVersion=Number(version||0)||0;
  $('ddUpdateMessage').textContent=pendingDdServerVersion
    ? `קיימת רשימת DD חדשה בשרת (גרסה ${pendingDdServerVersion}). האם לעדכן את הרשימה המקומית?`
    : 'קיימת רשימת DD חדשה בשרת. האם לעדכן את הרשימה המקומית?';
  $('ddUpdateModal').classList.remove('hidden');
  $('ddUpdateModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

function closeDdUpdatePrompt(){
  $('ddUpdateModal').classList.add('hidden');
  $('ddUpdateModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}

async function checkDdServerUpdate(){
  try{
    const r=await fetch(`${DD_SERVER_URL}?meta=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) return;
    const raw=await r.json();
    const remoteVersion=Number(raw.version||0)||0;
    if(!remoteVersion) return;

    const localTables=getDdTables();
    const localVersion=Number(
      localStorage.getItem(KEY_DD_SERVER_VERSION) || localTables.sourceVersion || 0
    ) || 0;

    if(remoteVersion>localVersion){
      openDdUpdatePrompt(remoteVersion);
    }
  }catch(e){}
}
function refreshDdStatus(){
  const el=$('ddStatus'); if(!el) return;
  const t=getDdTables();
  let when='לא עודכן עדיין';
  if(t.updatedAt){ try{when=new Date(t.updatedAt).toLocaleString('he-IL');}catch(e){} }
  const listVersion=Number(localStorage.getItem(KEY_DD_SERVER_VERSION)||t.sourceVersion||0)||0;
  const parts=availableLines(t).map(x=>{
    const lt=t.lines[x.key];
    return `${x.label}: שבוע ${lt.week.length} · חמישי ${lt.thursday.length} · DDR ${lt.ddr.length}`;
  });
  el.innerHTML=`${parts.map(x=>`<div>${escapeHtml(x)}</div>`).join('')}${listVersion?`<div>גרסת שרת: ${listVersion}</div>`:''}<div>עותק מקומי: ${escapeHtml(when)}</div>`;
}
function openDdEditor(){
  populateLineSelects();
  renderDdEditor();
  $('ddEditorModal').classList.remove('hidden');
  $('ddEditorModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeDdEditor(){
  $('ddEditorModal').classList.add('hidden');
  $('ddEditorModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}
function renderDdEditor(){
  const all=getDdTables(), line=$('ddEditLine')?.value||'red', t=getLineDdTables(line,all);
  const block=(title,key,list)=>`<div class="card"><h3 style="margin-top:0">${title}</h3>${
    list.length?list.map(x=>`<div class="payroll-row"><span><strong>${escapeHtml(ddKey(x.type,x.number))}</strong> <span class="muted">${escapeHtml(x.start)}–${escapeHtml(x.end)}</span></span><button type="button" class="secondary dd-delete" data-table="${key}" data-key="${escapeHtml(ddKey(x.type,x.number))}" style="width:auto">מחק</button></div>`).join(''):'<div class="muted">אין נתונים.</div>'
  }</div>`;
  $('ddEditorList').innerHTML=
    block('כל השבוע','week',t.week)+
    block('יום חמישי','thursday',t.thursday)+
    block('DDR','ddr',t.ddr);
  document.querySelectorAll('.dd-delete').forEach(btn=>{
    btn.onclick=()=>{
      const d=getDdTables(), line=$('ddEditLine')?.value||'red';
      const lt=getLineDdTables(line,d);
      lt[btn.dataset.table]=lt[btn.dataset.table].filter(x=>ddKey(x.type,x.number)!==btn.dataset.key);
      d.lines=d.lines||{}; d.lines[line]=lt;
      if(line==='red'){ d.week=lt.week; d.thursday=lt.thursday; d.ddr=lt.ddr; }
      d.updatedAt=new Date().toISOString();
      saveDdTables(d); renderDdEditor();
    };
  });
}
function saveLocalDdEntry(){
  const table=$('ddEditTable').value;
  const type=table==='ddr'?'DDR':'DD';
  const number=$('ddEditNumber').value.trim();
  const start=normalizeOperationalTime($('ddEditStart').value);
  const end=normalizeOperationalTime($('ddEditEnd').value);
  if(!number || !isOperationalTime(start) || !isOperationalTime(end)){
    alert('יש למלא מספר ושעות בפורמט HH:MM. אפשר גם שעות אחרי חצות כמו 25:54.');
    return;
  }
  const t=getDdTables(), line=$('ddEditLine')?.value||'red', lt=getLineDdTables(line,t), key=ddKey(type,number), item={type,number,start,end};
  const i=lt[table].findIndex(x=>ddKey(x.type,x.number)===key);
  if(i>=0) lt[table][i]=item; else lt[table].push(item);
  t.lines=t.lines||{}; t.lines[line]=lt;
  if(line==='red'){ t.week=lt.week; t.thursday=lt.thursday; t.ddr=lt.ddr; }
  t.updatedAt=new Date().toISOString();
  saveDdTables(t);
  $('ddEditNumber').value=''; $('ddEditStart').value=''; $('ddEditEnd').value='';
  renderDdEditor();
}

function monthDateStrings(month){
  if(!/^\d{4}-\d{2}$/.test(month||'')) return [];
  const [year,monthNum]=month.split('-').map(Number);
  const days=new Date(year,monthNum,0).getDate();
  const result=[];
  for(let day=1;day<=days;day++){
    result.push(`${year}-${String(monthNum).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
  }
  return result;
}

function monthlyExistingCount(date){
  return shifts.filter(sh=>sh.date===date).length;
}

function renderMonthlyEntry(){
  const month=$('monthlyEntryMonth').value;
  const dates=monthDateStrings(month);
  const list=$('monthlyEntryList');

  if(!dates.length){
    list.innerHTML='<div class="muted">יש לבחור חודש.</div>';
    return;
  }

  list.innerHTML=dates.map(date=>{
    const [,m,d]=date.split('-');
    const existing=monthlyExistingCount(date);
    const existingText=existing
      ? `<span class="bulk-existing">${existing===1?'קיימת משמרת':'קיימות '+existing+' משמרות'}</span>`
      : '';

    const line=$('monthlyEntryLine')?.value||'red';
    const options=allDdForDate(date,line).map(item=>{
      const key=ddKey(item.type,item.number);
      const source=item.sourceTable==='thursday'?'חמישי':(item.sourceTable==='ddr'?'DDR':'שבוע');
      return `<option value="${escapeHtml(key)}">${escapeHtml(key)} · ${escapeHtml(item.start)}–${escapeHtml(item.end)} · ${source}</option>`;
    }).join('');

    return `
      <div class="bulk-row bulk-dd-row" data-bulk-date="${date}">
        <div class="bulk-date">
          ${d}/${m}
          <small>${escapeHtml(dayNameHe(date))}</small>
          ${existingText}
        </div>
        <label>
          <span class="hidden">בחירת DD / DDR ${date}</span>
          <select class="bulk-dd-select" aria-label="בחירת DD / DDR ${date}">
            <option value="">ללא משמרת</option>
            ${options}
          </select>
        </label>
      </div>`;
  }).join('');
}

function openMonthlyEntry(){
  setTimeout(refreshDateInputDisplays,0);
  populateLineSelects();
  const selectedMonth=$('shiftMonthFilter').value || currentMonth;
  $('monthlyEntryMonth').value=selectedMonth;
  renderMonthlyEntry();
  $('monthlyEntryModal').classList.remove('hidden');
  $('monthlyEntryModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

function closeMonthlyEntry(){
  $('monthlyEntryModal').classList.add('hidden');
  $('monthlyEntryModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}

function saveMonthlyEntry(){
  const rows=[...document.querySelectorAll('#monthlyEntryList .bulk-row')];
  const candidates=[];
  const invalid=[];

  rows.forEach(row=>{
    const date=row.dataset.bulkDate;
    const key=row.querySelector('.bulk-dd-select')?.value || '';
    if(!key) return;

    const m=/^(DDR|DD)(.+)$/i.exec(key);
    if(!m){
      invalid.push(formatDateHe(date));
      return;
    }

    const type=m[1].toUpperCase();
    const number=m[2];
    const line=$('monthlyEntryLine')?.value||'red';
    const tpl=resolveDdTemplate(date,type,number,line);

    if(!tpl){
      invalid.push(formatDateHe(date));
      return;
    }

    const plan=snapshotDdPlan(date,type,number,line);
    candidates.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      date,
      start:operationalToClock(tpl.start),
      end:operationalToClock(tpl.end),
      breakMin:'0',
      notes:'',
      dayType:ddLooksLikeSplit(tpl)?'split':'auto',
      bonus:'0',
      extraLoopType:'none',
      nightLineType:'none',
      ddType:type,
      ddNumber:number,
      line,
      trips:plan.trips,
      plannedEvents:plan.plannedEvents,
      ddPlanSnapshot:plan.ddPlanSnapshot
    });
  });

  if(invalid.length){
    alert(`לא ניתן למצוא את הסידור המקומי בימים הבאים:\n${invalid.join(', ')}`);
    return;
  }

  if(!candidates.length){
    alert('לא נבחר DD/DDR באף יום.');
    return;
  }

  let added=0, skipped=0;
  candidates.forEach(data=>{
    // אותה משמרת בסיסית לא תתווסף פעמיים.
    const exists=shifts.some(sh=>
      sh.date===data.date &&
      shiftLine(sh)===data.line &&
      sh.ddType===data.ddType &&
      String(sh.ddNumber||'')===String(data.ddNumber||'') &&
      sh.start===data.start &&
      sh.end===data.end
    );
    if(exists){
      skipped++;
      return;
    }
    shifts.push(data);
    added++;
  });

  shifts=dedupeShifts(shifts);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));

  const month=$('monthlyEntryMonth').value;
  if(month) $('shiftMonthFilter').value=month;
  $('shiftSpecialFilter').value='all';
  renderShifts();
  renderSummary();
  if(typeof renderPayslipComparison==='function') renderPayslipComparison();
  closeMonthlyEntry();

  const parts=[`נוספו ${added} משמרות.`];
  if(skipped) parts.push(`${skipped} משמרות שכבר היו קיימות דולגו.`);
  parts.push('אפשר לפתוח כל משמרת ולשנות שעות או להוסיף סיבוב, קו לילה, הערות ותוספות.');
  alert(parts.join('\n'));
}

function openShiftModal(editing=false){
  setTimeout(refreshDateInputDisplays,0);
  populateLineSelects({shiftLine:$('shiftLine')?.value||defaultLineKey()});
  setTimeout(refreshDdPresetOptions,0);
  $('shiftModal').classList.remove('hidden');
  $('shiftModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  $('shiftModalTitle').textContent=editing?'עריכת משמרת':'הוספת משמרת';
}

function closeShiftModal(){
  $('shiftModal').classList.add('hidden');
  $('shiftModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}



$('confirmDdUpdate').onclick=updateDdFromServer;
$('laterDdUpdate').onclick=closeDdUpdatePrompt;
$('closeDdUpdate').onclick=closeDdUpdatePrompt;
$('ddUpdateBackdrop').onclick=closeDdUpdatePrompt;
$('updateDdFromServer').onclick=updateDdFromServer;
$('downloadDdCopy')?.addEventListener('click',downloadDdLocalCopy);
$('previewDdHeaderBtn')?.addEventListener('click',openDdPreview);
$('closeDdPreview')?.addEventListener('click',closeDdPreview);
$('ddPreviewBackdrop')?.addEventListener('click',closeDdPreview);
$('ddPreviewLine')?.addEventListener('change',refreshDdPreviewOptions);
$('ddPreviewDay')?.addEventListener('change',refreshDdPreviewOptions);
$('ddPreviewSelect')?.addEventListener('change',renderDdPreview);
$('exportDdPreviewPdfBtn')?.addEventListener('click',exportDdPreviewPdf);
$('editLocalDd').onclick=openDdEditor;
$('closeDdEditor').onclick=closeDdEditor;
$('ddEditorBackdrop').onclick=closeDdEditor;
$('saveDdLocal').onclick=saveLocalDdEntry;
$('ddEditLine')?.addEventListener('change',renderDdEditor);
$('monthlyEntryLine')?.addEventListener('change',renderMonthlyEntry);
$('ddEditTable').addEventListener('change',()=>{$('ddEditType').value=$('ddEditTable').value==='ddr'?'DDR':'DD'; $('ddEditType').disabled=true;});
$('ddEditType').disabled=true;
$('ddPreset').addEventListener('change',e=>applyDdPreset(e.target.value));
$('date').addEventListener('change',refreshDdPresetOptions);
populateLineSelects();
refreshDdStatus();
refreshDdPresetOptions();

$('bulkDeleteBtn').onclick=deleteSelectedShifts;
$('openMonthlyEntry').onclick=openMonthlyEntry;
$('closeMonthlyEntry').onclick=closeMonthlyEntry;
$('monthlyEntryBackdrop').onclick=closeMonthlyEntry;
$('monthlyEntryMonth').addEventListener('change',renderMonthlyEntry);
$('clearMonthlyDd').onclick=()=>{
  document.querySelectorAll('#monthlyEntryList .bulk-dd-select')
    .forEach(select=>select.value='');
};
$('saveMonthlyEntry').onclick=saveMonthlyEntry;

$('openShiftModal').onclick=()=>{
  editingShiftId=null;
  $('addShift').textContent='הוסף משמרת';
  $('shiftModalTitle').textContent='הוספת משמרת';
  $('date').value=new Date().toISOString().slice(0,10);
  $('start').value='';
  $('end').value='';
  $('splitStart2').value='';
  $('splitEnd2').value='';
  if($('splitDidNotReturn')) $('splitDidNotReturn').checked=false;
  $('breakMin').value='0';
  $('notes').value='';
  $('dayType').value='auto';
  $('bonus').value='0';
  $('extraLoopType').value='none';
  $('nightLineType').value='none';
  if($('shiftLine')) $('shiftLine').value=defaultLineKey();
  $('ddPreset').value='';
  openShiftModal(false);
};
$('closeShiftModal').onclick=closeShiftModal;
$('shiftModalBackdrop').onclick=closeShiftModal;
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!$('ddUpdateModal').classList.contains('hidden')) closeDdUpdatePrompt();
    else if(!$('ddEditorModal').classList.contains('hidden')) closeDdEditor();
    else if(!$('monthlyEntryModal').classList.contains('hidden')) closeMonthlyEntry();
    else if(!$('shiftDetailsModal').classList.contains('hidden')) closeShiftDetails();
    else if(!$('shiftModal').classList.contains('hidden')) closeShiftModal();
  }
});
$('closeShiftDetails').onclick=closeShiftDetails;
$('shiftDetailsBackdrop').onclick=closeShiftDetails;

$('addShift').onclick=()=>{
  const isSplit=$('dayType').value==='split';
  const splitStart2=$('splitStart2').value||'';
  const splitEnd2=$('splitEnd2').value||'';
  const didNotReturn=isSplit && !!$('splitDidNotReturn')?.checked;
  const selectedDdKey=$('ddPreset').value||'';

  if(!$('date').value){
    alert('יש למלא תאריך.');
    return;
  }
  // Manual shifts still need basic times. DD shifts can be saved for the month
  // using the DD's planned hours and updated with actual split times later.
  if(!selectedDdKey && (!$('start').value || !$('end').value)){
    alert(isSplit?'במשמרת ידנית יש למלא לפחות כניסה 1 ויציאה 1.':'יש למלא התחלה וסיום.');
    return;
  }

  const selectedDdMatch=/^(DDR|DD)(.+)$/i.exec(selectedDdKey);
  const selectedDdType=selectedDdMatch?selectedDdMatch[1].toUpperCase():'';
  const selectedDdNumber=selectedDdMatch?selectedDdMatch[2]:'';

  const oldShift=editingShiftId?shifts.find(x=>x.id===editingShiftId):null;

  // When editing an existing DD shift the selector may not carry the DD key,
  // so preserve its existing DD metadata and planned times.
  const ddType=selectedDdType || oldShift?.ddType || '';
  const ddNumber=selectedDdNumber || oldShift?.ddNumber || '';
  let startValue=$('start').value||oldShift?.start||'';
  let firstEnd=$('end').value||oldShift?.splitEnd1||oldShift?.end||'';

  if(selectedDdKey && (!startValue || !firstEnd)){
    const tpl=resolveDdTemplate($('date').value,selectedDdType,selectedDdNumber,$('shiftLine')?.value||oldShift?.line||'red');
    if(tpl){
      startValue=startValue||operationalToClock(tpl.start);
      firstEnd=firstEnd||operationalToClock(tpl.end);
    }
  }

  const returned=!!(splitStart2&&splitEnd2) && !didNotReturn;
  const overallEnd=isSplit&&returned?splitEnd2:firstEnd;

  const selectedLine=$('shiftLine')?.value||oldShift?.line||'red';
  const oldPlanIdentity=oldShift?ddPlanIdentity(oldShift.date,oldShift.ddType,oldShift.ddNumber,shiftLine(oldShift)):'';
  const newPlanIdentity=ddPlanIdentity($('date').value,ddType,ddNumber,selectedLine);
  // Critical data-safety rule: editing hours/notes must NEVER rebuild the DD plan.
  // A plan is copied on a new shift, or replaced only when the actual DD/line/day-plan changes.
  const ddPlanChanged=!!oldShift && oldPlanIdentity!==newPlanIdentity;
  if(ddPlanChanged && newPlanIdentity && !resolveDdTemplate($('date').value,ddType,ddNumber,selectedLine)){
    alert('הקו / היום שנבחרו אינם מכילים את ה-DD הזה. יש לבחור DD תקף לפני השמירה.');
    return;
  }
  if(ddPlanChanged && !confirmDdPlanReplacement(oldShift,`${lineLabel(selectedLine)} · ${displayDdNumber(ddType,ddNumber)}`)) return;
  const copiedPlan=(!oldShift && selectedDdKey) || (oldShift && ddPlanChanged && newPlanIdentity)
    ? snapshotDdPlan($('date').value,ddType,ddNumber,selectedLine)
    : null;
  const data = {
    ...(oldShift||{}),
    id: editingShiftId || (crypto.randomUUID?crypto.randomUUID():String(Date.now())),
    date:$('date').value,
    start:startValue,
    end:overallEnd,
    splitEnd1:isSplit && (returned||didNotReturn)?firstEnd:'',
    splitStart2:isSplit&&!didNotReturn?splitStart2:'',
    splitEnd2:isSplit&&!didNotReturn?splitEnd2:'',
    splitDidNotReturn:didNotReturn,
    breakMin:$('breakMin').value,
    notes:$('notes').value.trim(),
    dayType:$('dayType').value,
    bonus:$('bonus').value,
    extraLoopType:$('extraLoopType').value,
    nightLineType:$('nightLineType').value,
    ddType,
    ddNumber,
    line:selectedLine,
    ...(copiedPlan?{
      trips:copiedPlan.trips,
      plannedEvents:copiedPlan.plannedEvents,
      ddPlanSnapshot:copiedPlan.ddPlanSnapshot,
      ...(ddPlanChanged?{reports:reportsWithoutOldTripLinks(oldShift?.reports||[])}:{})
    }:{})
  };

  if(editingShiftId){
    const duplicate=shifts.some(x=>x.id!==editingShiftId && shiftSignature(x)===shiftSignature(data));
    if(duplicate){
      alert('כבר קיימת משמרת זהה בתאריך ובשעות האלה.');
      return;
    }
    const i=shifts.findIndex(x=>x.id===editingShiftId);
    if(i>=0) shifts[i]=data;
    editingShiftId=null;
    $('addShift').textContent='הוסף משמרת';
  }else{
    const duplicate=shifts.some(x=>shiftSignature(x)===shiftSignature(data));
    if(duplicate){
      alert('המשמרת הזו כבר קיימת ולא נשמרה שוב.');
      return;
    }
    shifts.push(data);
  }

  shifts=dedupeShifts(shifts);
  localStorage.setItem(KEY_SHIFTS,JSON.stringify(shifts));
  renderShifts(); renderSummary(); renderTodayDashboard();
  window.dispatchEvent(new CustomEvent('salary-shift-changed',{
    detail:{action:'upsert',shiftId:data.id}
  }));

  $('start').value='';
  $('end').value='';
  $('splitStart2').value='';
  $('splitEnd2').value='';
  if($('splitDidNotReturn')) $('splitDidNotReturn').checked=false;
  $('bonus').value='0';
  $('extraLoopType').value='none';
  $('nightLineType').value='none';
  $('ddPreset').value='';
  $('dayType').value='auto';
  updateSplitShiftUi();
  closeShiftModal();
};

$('shiftLine')?.addEventListener('change',()=>{ $('ddPreset').value=''; refreshDdPresetOptions(); });
$('date')?.addEventListener('change',refreshDdPresetOptions);
$('dayType')?.addEventListener('change',updateSplitShiftUi);
$('end')?.addEventListener('change',updateSplitShiftUi);
$('splitStart2')?.addEventListener('change',updateSplitShiftUi);
$('splitEnd2')?.addEventListener('change',updateSplitShiftUi);
$('splitDidNotReturn')?.addEventListener('change',updateSplitShiftUi);

$('saveSettings').onclick=saveAllGeneralSettings;
$('floatingSaveSettings')?.addEventListener('click',saveAllGeneralSettings);

$('manualUpdateCheckBtn')?.addEventListener('click',async()=>{
  const btn=$('manualUpdateCheckBtn'), status=$('manualUpdateStatus');
  btn.disabled=true; btn.textContent='בודק...'; status.textContent='';
  try{
    const res=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});
    if(!res.ok) throw new Error('version');
    const data=await res.json(), latest=Number(data.version||0), latestLabel=String(data.displayVersion||latest);
    if(latest>APP_VERSION){
      status.innerHTML=`קיים עדכון חדש: גרסה <strong>${latestLabel}</strong>.`;
      if(confirm(`קיים עדכון חדש לגרסה ${latestLabel}. לעדכן עכשיו?`)){
        const reg=await navigator.serviceWorker?.getRegistration?.();
        if(reg) await reg.update().catch(()=>{});
        location.reload();
      }
    }else if(latest===APP_VERSION){
      status.textContent=`האפליקציה מעודכנת לגרסה ${APP_VERSION_LABEL}.`;
    }else{
      status.textContent=`הגרסה המותקנת היא ${APP_VERSION_LABEL}.`;
    }
  }catch(e){
    status.textContent='לא ניתן לבדוק עדכונים כרגע. נסה שוב כשיש חיבור לאינטרנט.';
  }finally{
    btn.disabled=false; btn.textContent='בדיקת עדכונים';
  }
});


$('addReportTypeBtn')?.addEventListener('click',addReportType);
$('newReportType')?.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addReportType(); } });
$('resetReportTypesBtn')?.addEventListener('click',()=>{
  if(!confirm('לשחזר את רשימת סוגי הדוחות לברירת המחדל?')) return;
  saveReportTypes([...DEFAULT_REPORT_TYPES]);
});
$('closeReportModal')?.addEventListener('click',closeReportModal);
$('reportModalBackdrop')?.addEventListener('click',closeReportModal);
$('saveReportBtn')?.addEventListener('click',saveDriverReport);

$('closeApprovalModal')?.addEventListener('click',closeApprovalModal);
$('approvalModalBackdrop')?.addEventListener('click',closeApprovalModal);
$('saveApprovalBtn')?.addEventListener('click',saveShiftApproval);
$('closeTripModal')?.addEventListener('click',closeTripModal);
$('tripModalBackdrop')?.addEventListener('click',closeTripModal);
$('saveTripBtn')?.addEventListener('click',saveTrip);
$('tripStartTime')?.addEventListener('change',()=>updateTripDurationUi({syncEnd:true}));
$('tripType')?.addEventListener('change',updateTripTypeUi);
$('tripTimingStatus')?.addEventListener('change',()=>updateTripDurationUi({syncEnd:true}));
$('tripTimingMinutes')?.addEventListener('input',()=>updateTripDurationUi({syncEnd:true}));
$('tripEndTime')?.addEventListener('change',syncTimingFromActualEnd);
$('liveQuickFab')?.addEventListener('click',toggleLiveQuickMenu);
document.addEventListener('click',e=>{
  const w=$('liveQuickFabWrap');
  if(w && !w.contains(e.target)) closeLiveQuickMenu();
});
refreshLiveQuickActions();
setInterval(refreshLiveQuickActions,30000);

setInterval(()=>{
  const today=$('todayDashboard');
  if(today && !today.classList.contains('hidden')) renderTodayDashboard();
},30000);



$('saveHomeLayout').onclick=()=>{ saveHomeLayout(); alert('תצוגת מסך הבית נשמרה.'); };
$('saveAnalyticsCharts').onclick=()=>{ saveAnalyticsChartLayout(); alert('תצוגת הגרפים נשמרה.'); };
$('monthFilter').onchange=renderSummary;

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

function exportMonthlyPdf(){
  const month=$('monthFilter').value;
  const filtered=(month?shifts.filter(s=>s.date.startsWith(month)):shifts)
    .slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
  const travelInfo=monthlyTravelForShifts(filtered);

  if(!filtered.length){
    alert('אין משמרות בחודש שנבחר.');
    return;
  }

  const rows=filtered.map(sh=>{
    const c=calcShift(sh);
    const specialText=specialDescription(sh);
    const extraPayments=c.travel+c.perDiem+c.specialPay+c.bonus+c.nightExtra;
    return `
      <tr>
        <td>${escapeHtml(formatDateHe(sh.date))}</td>
        <td>${escapeHtml(dayNameHe(sh.date))}</td>
        <td>
          ${escapeHtml(sh.start)}-${escapeHtml(sh.end)}
          ${(sh.ddType && sh.ddNumber!=='')?`<div class="small">${escapeHtml(displayShiftDd(sh))}</div>`:''}${sh.notes?`<div class="small">${escapeHtml(sh.notes)}</div>`:''}
        </td>
        <td>${fmtMin(c.grossMinutes)}</td>
        <td>${fmtMin(c.regMin)}</td>
        <td>${fmtMin(c.ot1Min)}</td>
        <td>${fmtMin(c.ot2Min)}</td>
        <td>${fmtMin(c.nightMin)}</td>
        <td>${currency(c.regPay)}</td>
        <td>${currency(c.ot1Pay+c.ot2Pay)}</td>
        <td>
          ${currency(extraPayments)}
          ${specialText?`<div class="small">${escapeHtml(specialText)}</div>`:''}
        </td>
        <td class="total">${currency(c.pay)}</td>
      </tr>`;
  }).join('');

  const totals={
    grossMinutes:0,regMin:0,ot1Min:0,ot2Min:0,nightMin:0,
    regPay:0,otPay:0,nightExtra:0,travel:0,perDiem:0,specialPay:0,bonus:0,pay:0
  };

  filtered.forEach(sh=>{
    const c=calcShift(sh);
    totals.grossMinutes+=c.grossMinutes;
    totals.regMin+=c.regMin;
    totals.ot1Min+=c.ot1Min;
    totals.ot2Min+=c.ot2Min;
    totals.nightMin+=c.nightMin;
    totals.regPay+=c.regPay;
    totals.otPay+=c.ot1Pay+c.ot2Pay;
    totals.nightExtra+=c.nightExtra;
    totals.perDiem+=c.perDiem;
    totals.specialPay+=c.specialPay;
    totals.bonus+=c.bonus;
    totals.pay+=c.pay-c.travel;
  });
  totals.travel=travelInfo.paid;
  totals.pay+=travelInfo.paid;

  const net=estimateNetDetails(totals.pay);
  const monthTitle=month
    ? new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(new Date(month+'-01T12:00:00'))
    : 'כל התקופה';

  const reportHtml=`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>דוח שעות ושכר - ${escapeHtml(monthTitle)}</title>
<style>
  @page{size:A4 landscape;margin:9mm}
  *{box-sizing:border-box}
  body{font-family:Arial,"Segoe UI",sans-serif;color:#111;margin:0;direction:rtl;font-size:10px}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#555;margin-bottom:14px;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:12px}
  .box{border:1px solid #d8dbe2;border-radius:8px;padding:8px}
  .box b{display:block;font-size:14px;margin-top:3px}
  table{width:100%;border-collapse:collapse;table-layout:auto}
  th,td{border:1px solid #d8dbe2;padding:5px 4px;text-align:center;vertical-align:middle}
  th{background:#f1f3f6;font-weight:700}
  tbody tr:nth-child(even){background:#fafafa}
  .small{font-size:8px;color:#555;margin-top:2px;line-height:1.25}
  .total{font-weight:700}
  .pay-summary{margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .pay-summary .box{min-height:54px}
  .net{background:#111827;color:white;border-color:#111827}
  .note{margin-top:9px;font-size:8.5px;color:#666}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    button{display:none!important}
  }
</style>
</head>
<body>
  <h1>דוח שעות ושכר</h1>
  <div class="sub">${escapeHtml(monthTitle)} · ${filtered.length} משמרות</div>

  <div class="summary">
    <div class="box">סה"כ שעות<b>${fmtMin(totals.grossMinutes)}</b></div>
    <div class="box">שעות רגילות<b>${fmtMin(totals.regMin)}</b></div>
    <div class="box">125%<b>${fmtMin(totals.ot1Min)}</b></div>
    <div class="box">150%<b>${fmtMin(totals.ot2Min)}</b></div>
    <div class="box">שעות לילה<b>${fmtMin(totals.nightMin)}</b></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>תאריך</th>
        <th>יום</th>
        <th>משמרת</th>
        <th>סה"כ שעות</th>
        <th>רגילות</th>
        <th>125%</th>
        <th>150%</th>
        <th>לילה</th>
        <th>שכר רגיל</th>
        <th>שעות נוספות</th>
        <th>תשלומים נוספים</th>
        <th>סה"כ למשמרת</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="pay-summary">
    <div class="box">נסיעות<b>${currency(totals.travel)}</b><span class="small">${travelInfo.workDays} ימים × ${currency(travelInfo.perDay)}${travelInfo.cap>0?` · תקרה ${currency(travelInfo.cap)}`:''}</span></div>
    <div class="box">אש"ל<b>${currency(totals.perDiem)}</b></div>
    <div class="box">תוספות מיוחדות<b>${currency(totals.specialPay)}</b></div>
    <div class="box">תוספת לילה<b>${currency(totals.nightExtra)}</b></div>
    <div class="box">תוספות ידניות<b>${currency(totals.bonus)}</b></div>
    <div class="box">ברוטו מחושב<b>${currency(totals.pay)}</b></div>
    <div class="box">מס הכנסה<b>${currency(net.tax)}</b></div>
    <div class="box">ביטוח לאומי<b>${currency(net.nationalInsurance)}</b></div>
    <div class="box">ביטוח בריאות<b>${currency(net.healthInsurance)}</b></div>
    <div class="box">פנסיה עובד<b>${currency(net.pension)}</b></div>
    <div class="box">ניכוי ועד<b>${currency(net.unionDeduction)}</b></div>
    <div class="box net">נטו משוער<b>${currency(net.net)}</b></div>
  </div>

  <div class="note">
    הדוח מבוסס על הנתונים וההגדרות שהוזנו באפליקציה. מס הכנסה, ביטוח לאומי וביטוח בריאות מחושבים לפי המדרגות שבהגדרות או לפי ברירת המחדל של 2026; הנטו עדיין משוער.
  </div>

<script>
  window.onload=()=>{ setTimeout(()=>window.print(),250); };
<\/script>
</body>
</html>`;

  const reportWindow=window.open('','_blank');
  if(!reportWindow){
    alert('הדפדפן חסם את חלון הדוח. יש לאפשר חלונות קופצים ולנסות שוב.');
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
}



// v36 — Customizable Today dashboard layout
let dashboardCalendarMonth='';

function localDateIso(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function addMonthsToYm(ym,delta){
  const [y,m]=ym.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthLabelHe(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}
function dashboardTotalsForList(list){
  const items=Array.isArray(list)?list:[];
  const travelInfo=monthlyTravelForShifts(items);
  let gross=0,minutes=0;
  items.forEach(sh=>{
    const c=calcShift(sh);
    minutes+=c.grossMinutes||0;
    gross+=(c.pay||0)-(c.travel||0);
  });
  gross+=travelInfo.paid;
  return {gross,minutes,count:items.length,travelInfo};
}
function shiftStatusText(sh){
  if(!sh) return '';
  const now=new Date();
  const [y,m,d]=sh.date.split('-').map(Number);
  const [shh,smm]=sh.start.split(':').map(Number);
  const [ehh,emm]=sh.end.split(':').map(Number);
  const start=new Date(y,m-1,d,shh,smm,0,0);
  let end=new Date(y,m-1,d,ehh,emm,0,0);
  if(end<=start) end.setDate(end.getDate()+1);
  const mins=n=>Math.max(0,Math.round(n/60000));
  if(now<start){ const x=mins(start-now); return `המשמרת מתחילה בעוד ${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`; }
  if(now<=end){ const x=mins(end-now); return `במשמרת עכשיו · נשארו בערך ${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`; }
  return 'המשמרת הסתיימה';
}
function previousYm(ym){ return addMonthsToYm(ym,-1); }
function samePeriodList(ym,dayLimit){
  return shifts.filter(sh=>sh.date.startsWith(ym) && Number(sh.date.slice(8,10))<=dayLimit);
}
function pctDelta(current,previous){
  if(previous===0){
    if(current===0) return {text:'ללא שינוי',cls:'same'};
    return {text:'חדש לעומת 0 בחודש קודם',cls:'up'};
  }
  const pct=(current-previous)/previous*100;
  if(Math.abs(pct)<0.05) return {text:'ללא שינוי',cls:'same'};
  return {text:`${pct>0?'▲':'▼'} ${Math.abs(pct).toFixed(1)}%`,cls:pct>0?'up':'down'};
}
function setCompareDelta(id,current,previous){
  const d=pctDelta(current,previous), el=$(id);
  el.textContent=d.text;
  el.className=`comparison-delta ${d.cls}`;
}
function shortMonthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Intl.DateTimeFormat('he-IL',{month:'short'}).format(new Date(y,m-1,1));
}
function historyMonths(endYm,count=6){
  const arr=[];
  for(let i=count-1;i>=0;i--) arr.push(addMonthsToYm(endYm,-i));
  return arr;
}
function renderMiniBarChart(containerId,rows,valueKey,formatter,currentYm){
  const el=$(containerId); if(!el) return;
  const max=Math.max(0,...rows.map(r=>Number(r[valueKey])||0));
  el.innerHTML=rows.map(r=>{
    const v=Number(r[valueKey])||0;
    const pct=max>0?Math.max(2,Math.round(v/max*100)):2;
    const current=r.ym===currentYm?' mini-chart-current':'';
    return `<div class="mini-chart-col${current}" title="${escapeHtml(monthLabelHe(r.ym))}: ${escapeHtml(formatter(v))}">
      <div class="mini-chart-value">${escapeHtml(formatter(v))}</div>
      <div class="mini-chart-bar-wrap"><div class="mini-chart-bar" style="height:${pct}%"></div></div>
      <div class="mini-chart-label">${escapeHtml(shortMonthLabel(r.ym))}</div>
    </div>`;
  }).join('');
}
function analyticsTotalsForMonth(ym){
  const list=shifts.filter(sh=>sh.date.startsWith(ym));
  const base=dashboardTotalsForList(list);
  let regularMin=0,ot125Min=0,ot150Min=0,saturdayMin=0,nightMin=0;
  list.forEach(sh=>{
    const c=calcShift(sh);
    if(c.type==='saturday') saturdayMin+=c.grossMinutes||0;
    else regularMin+=c.regMin||0;
    ot125Min+=c.ot1Min||0;
    ot150Min+=c.ot2Min||0;
    nightMin+=c.nightMin||0;
  });
  return {
    gross:base.gross,
    net:estimateNetDetails(base.gross).net,
    hours:base.minutes/60,
    regular:regularMin/60,
    ot125:ot125Min/60,
    ot150:ot150Min/60,
    saturday:saturdayMin/60,
    night:nightMin/60
  };
}
function renderDashboardAnalytics(){
  const todayIso=localDateIso();
  const currentYm=todayIso.slice(0,7);
  const prevYm=previousYm(currentYm);
  const dayLimit=Number(todayIso.slice(8,10));
  const currentList=samePeriodList(currentYm,dayLimit);
  const prevDays=new Date(Number(prevYm.slice(0,4)),Number(prevYm.slice(5,7)),0).getDate();
  const prevList=samePeriodList(prevYm,Math.min(dayLimit,prevDays));
  const cur=dashboardTotalsForList(currentList), prev=dashboardTotalsForList(prevList);
  const curNet=estimateNetDetails(cur.gross).net, prevNet=estimateNetDetails(prev.gross).net;
  $('analyticsPeriodLabel').textContent=`עד יום ${dayLimit}`;
  $('compareGross').textContent=currency(cur.gross);
  $('compareHours').textContent=fmtMin(cur.minutes);
  $('compareShifts').textContent=String(cur.count);
  $('compareNet').textContent=currency(curNet);
  setCompareDelta('compareGrossDelta',cur.gross,prev.gross);
  setCompareDelta('compareHoursDelta',cur.minutes,prev.minutes);
  setCompareDelta('compareShiftsDelta',cur.count,prev.count);
  setCompareDelta('compareNetDelta',curNet,prevNet);
  const prevFull=dashboardTotalsForList(shifts.filter(sh=>sh.date.startsWith(prevYm)));
  $('compareNote').textContent=`ההשוואה היא לאותה נקודה בחודש: ${monthLabelHe(currentYm)} עד יום ${dayLimit} מול ${monthLabelHe(prevYm)} עד יום ${Math.min(dayLimit,prevDays)}. סך החודש הקודם: ${currency(prevFull.gross)} · ${fmtMin(prevFull.minutes)} שעות.`;
  const rows=historyMonths(currentYm,6).map(ym=>({ym,...analyticsTotalsForMonth(ym)}));
  renderMiniBarChart('grossHistoryChart',rows,'gross',v=>currency(v),currentYm);
  renderMiniBarChart('netHistoryChart',rows,'net',v=>currency(v),currentYm);
  renderMiniBarChart('hoursHistoryChart',rows,'hours',v=>`${v.toFixed(1)}ש׳`,currentYm);
  renderMiniBarChart('regularHistoryChart',rows,'regular',v=>`${v.toFixed(1)}ש׳`,currentYm);
  renderMiniBarChart('ot125HistoryChart',rows,'ot125',v=>`${v.toFixed(1)}ש׳`,currentYm);
  renderMiniBarChart('ot150HistoryChart',rows,'ot150',v=>`${v.toFixed(1)}ש׳`,currentYm);
  renderMiniBarChart('saturdayHistoryChart',rows,'saturday',v=>`${v.toFixed(1)}ש׳`,currentYm);
  renderMiniBarChart('nightHistoryChart',rows,'night',v=>`${v.toFixed(1)}ש׳`,currentYm);
  applyAnalyticsChartLayout(analyticsChartLayoutDraft.length?analyticsChartLayoutDraft:getSavedAnalyticsChartLayout());
}
function shiftValueWeekdayLabel(day){
  return ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי','יום שבת'][day] || '';
}
function hideShiftValueResult(){
  const result=$('shiftValueResult'), clearBtn=$('clearShiftValue');
  if(result){ result.innerHTML=''; result.classList.add('hidden'); }
  if(clearBtn) clearBtn.classList.add('hidden');
  $('shiftValueActions')?.classList.add('clean');
}
function refreshShiftValueDdOptions(){
  const dateEl=$('shiftValueDate'), ddEl=$('shiftValueDd');
  if(!dateEl||!ddEl) return;
  const selectedDate=dateEl.value||localDateIso();
  const selectedLine=$('shiftValueLine')?.value||'red';
  const day=dayIndexForDate(selectedDate);
  const current=ddEl.value;
  const items=allDdForDate(selectedDate,selectedLine);

  ddEl.innerHTML='<option value="">בחר DD</option>'+items.map(x=>{
    const key=ddKey(x.type,x.number);
    const src=x.sourceTable==='ddr'?'DDR':shiftValueWeekdayLabel(day);
    return `<option value="${escapeHtml(key)}">${escapeHtml(key)} · ${escapeHtml(x.start)}–${escapeHtml(x.end)}${src?` · ${escapeHtml(src)}`:''}</option>`;
  }).join('');

  if([...ddEl.options].some(o=>o.value===current)) ddEl.value=current;
  else ddEl.value='';

  // A new date/line means the old simulation is no longer valid.
  // Only hide the old result here. Do NOT reset the date or call clearShiftValue(),
  // otherwise date-change -> refresh -> clear -> refresh can recurse and freeze the app.
  hideShiftValueResult();
}
function calculateShiftValue(){
  const date=$('shiftValueDate').value, key=$('shiftValueDd').value;
  const selectedLine=$('shiftValueLine')?.value||'red';
  if(!date || !key){ alert('בחר תאריך ו-DD / DDR.'); return; }
  const m=/^(DDR|DD)(.+)$/i.exec(key); if(!m) return;

  // Resolve again from the selected date, so the same DD number can have
  // different times on different weekdays without leaking another day's table.
  const tpl=resolveDdTemplate(date,m[1].toUpperCase(),m[2],selectedLine);
  if(!tpl){ alert('ה-DD לא קיים בתאריך שנבחר.'); refreshShiftValueDdOptions(); return; }
  const candidate={
    id:'sim-'+Date.now(),date,start:operationalToClock(tpl.start),end:operationalToClock(tpl.end),breakMin:0,notes:'',
    dayType:'auto',bonus:0,extraLoopType:'none',nightLineType:'none',ddType:m[1].toUpperCase(),ddNumber:m[2],line:selectedLine
  };
  const ym=date.slice(0,7);
  const beforeList=shifts.filter(sh=>sh.date.startsWith(ym));
  const afterList=[...beforeList,candidate];
  const beforeGross=dashboardTotalsForList(beforeList).gross;
  const afterGross=dashboardTotalsForList(afterList).gross;
  const before=estimateNetDetails(beforeGross), after=estimateNetDetails(afterGross);
  const grossDelta=afterGross-beforeGross, netDelta=after.net-before.net;
  const raw=calcShift(candidate);
  const d={
    tax:after.tax-before.tax,
    ni:after.nationalInsurance-before.nationalInsurance,
    health:after.healthInsurance-before.healthInsurance,
    pension:after.pension-before.pension,
    union:after.unionDeduction-before.unionDeduction
  };
  const result=$('shiftValueResult');
  result.classList.remove('hidden');
  $('clearShiftValue')?.classList.remove('hidden');
  $('shiftValueActions')?.classList.remove('clean');
  result.innerHTML=`
    <div class="shift-value-grid">
      <div class="shift-value-box"><span>ברוטו שנוסף לחודש</span><strong>${currency(grossDelta)}</strong></div>
      <div class="shift-value-box"><span>נטו שנשאר מהמשמרת</span><strong>${currency(netDelta)}</strong></div>
      <div class="shift-value-box"><span>ברוטו חודשי לפני</span><strong>${currency(beforeGross)}</strong></div>
      <div class="shift-value-box"><span>ברוטו חודשי אחרי</span><strong>${currency(afterGross)}</strong></div>
      <div class="shift-value-box"><span>נטו חודשי לפני</span><strong>${currency(before.net)}</strong></div>
      <div class="shift-value-box"><span>נטו חודשי אחרי</span><strong>${currency(after.net)}</strong></div>
    </div>
    <div class="shift-value-deductions">
      <div class="shift-value-row"><span>מס הכנסה נוסף</span><strong>− ${currency(d.tax)}</strong></div>
      <div class="shift-value-row"><span>ביטוח לאומי נוסף</span><strong>− ${currency(d.ni)}</strong></div>
      <div class="shift-value-row"><span>ביטוח בריאות נוסף</span><strong>− ${currency(d.health)}</strong></div>
      <div class="shift-value-row"><span>פנסיה עובד נוספת</span><strong>− ${currency(d.pension)}</strong></div>
      <div class="shift-value-row"><span>ניכוי ועד נוסף</span><strong>− ${currency(d.union)}</strong></div>
      <div class="shift-value-row"><span>שעות המשמרת</span><strong>${fmtMin(raw.grossMinutes)}</strong></div>
    </div>
    <p class="note">הנטו הוא ההפרש בין הנטו החודשי המשוער אחרי הוספת המשמרת לבין הנטו לפני הוספתה. נסיעות מתחשבות גם בתקרה החודשית.</p>`;
}
function clearShiftValue(){
  const dateEl=$('shiftValueDate'), ddEl=$('shiftValueDd');
  if(dateEl) dateEl.value=localDateIso();
  if(ddEl) ddEl.value='';
  hideShiftValueResult();
  refreshShiftValueDdOptions();
  if(ddEl) ddEl.value='';
}

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

function renderTodayDashboard(){
  const todayIso=localDateIso();
  const currentYm=todayIso.slice(0,7);
  if(!dashboardCalendarMonth) dashboardCalendarMonth=currentYm;

  const todayDate=new Date(todayIso+'T12:00:00');
  $('todayDateLabel').textContent=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(todayDate);

  const todays=shifts.filter(sh=>sh.date===todayIso).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(!todays.length){
    $('todayShiftContent').innerHTML=`<div class="today-chip" style="position:relative;z-index:1"><span>משמרת היום</span><strong>לא הוזנה משמרת</strong></div><div class="today-status">אפשר ללחוץ על ＋ ולהוסיף משמרת להיום.</div>`;
  }else{
    const liveToday=todays.find(x=>shiftLiveState(x).visible);
    const sh=liveToday||todays[0], c=calcShift(sh);
    const dd=(sh.ddType && sh.ddNumber!=='')?displayShiftDd(sh):lineLabel(shiftLine(sh));
    const todayReports=normalizedReports(sh).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    $('todayShiftContent').innerHTML=`
      ${liveShiftPanelHtml(sh)}
      <div class="today-shift-open" onclick="openShiftDetails('${sh.id}')">
        <div class="today-shift-open-head">
          <span class="today-shift-open-title">המשמרת שלי</span>
          <span class="today-open-hint">לחץ לפרטים ›</span>
        </div>
        <div class="today-shift-grid">
          <div class="today-chip"><span>DD / משמרת</span><strong>${escapeHtml(dd)}</strong></div>
          <div class="today-chip"><span>שעות</span><strong>${sh.dayType==='split'
            ? `${escapeHtml(sh.start||'—')}–${escapeHtml(sh.splitEnd1||sh.end||'—')}${sh.splitStart2&&sh.splitEnd2?` / ${escapeHtml(sh.splitStart2)}–${escapeHtml(sh.splitEnd2)}`:''}`
            : `${escapeHtml(sh.start)}–${escapeHtml(sh.end)}`}</strong></div>
          <div class="today-chip"><span>${c.isSplit?'עבודה / לתשלום':'משך'}</span><strong>${c.isSplit?`${fmtMin(c.workedMinutes)} / ${fmtMin(c.grossMinutes)}`:fmtMin(c.grossMinutes)}</strong></div>
          <div class="today-chip"><span>שכר צפוי</span><strong>${currency(c.pay)}</strong></div>
        </div>
        <div class="today-status">${escapeHtml(shiftStatusText(sh))}${todays.length>1?` · קיימות ${todays.length} משמרות היום${liveToday?' · מוצגת הפעילה עכשיו':''}`:''}</div>
        ${c.isSplit&&c.splitReturned&&!c.splitGapOk?`<div class="split-detail-warning">⚠ הפיצול קצר מ־3 שעות — דבר עם הסדרן כדי לסדר את זה.</div>`:''}
      </div>

      <div class="today-sections-stack">
        <div class="today-info-card">
          <div class="today-reports-header">
            <strong>נסיעות / חצאי סיבוב</strong>
            <button type="button" class="primary" onclick="openTripModal('${sh.id}')">${materialIcon("add")}<span>התחל סיבוב</span></button>
          </div>
          ${normalizedTrips(sh).length
            ? `<div class="today-report-preview">${normalizedTrips(sh).slice().sort((a,b)=>String(a.startTime||'').localeCompare(String(b.startTime||''))).map((t,i)=>{
                const active=!!(t.active&&!t.endTime);
                const actual=active?tripElapsedMinutes(sh,t):durationBetweenHm(t.startTime,t.endTime);
                return `<div class="today-trip-pill" style="display:block"><button type="button" class="today-trip-link" style="width:100%;border:0;background:transparent;text-align:right;padding:0" onclick="openTripModal('${sh.id}','${t.id}')"><strong>חצי סיבוב ${i+1} · ${escapeHtml(t.startPoint||'')} ${active?'· פעיל':''}</strong>${t.rb?` · ${escapeHtml(t.rb)}`:''}${t.trainNumber?` · רכבת ${escapeHtml(t.trainNumber)}`:''}<small>${escapeHtml(t.startTime||'—')}–${active?'עכשיו':escapeHtml(t.endTime||'—')} · ${active?'זמן שחלף':'בפועל'} ${actual?fmtMin(actual):'—'} · ${escapeHtml(tripTimingText(t,sh))}</small></button>${active?`<button type="button" class="primary" style="width:100%;margin-top:7px" onclick="finishActiveTripNow('${sh.id}','${t.id}')">⏹ סיום סיבוב עכשיו</button>`:''}</div>`;
              }).join('')}</div>`
            : `<div class="today-status">אין עדיין חצאי סיבוב מתועדים.</div>`}
        </div>

        <div class="today-info-card">
          <div class="today-reports-header">
            <strong>אישורים ושינויים</strong>
            <button type="button" class="secondary" onclick="openApprovalModal('${sh.id}')">${materialIcon("add")}<span>הוסף</span></button>
          </div>
          ${normalizedApprovals(sh).length
            ? `<div class="today-report-preview">${normalizedApprovals(sh).slice(-3).reverse().map(a=>`<span class="today-approval-pill">${escapeHtml(a.what||'')} · ${escapeHtml(a.approvedBy||'')}</span>`).join('')}</div>`
            : `<div class="today-status">אין אישורים או שינויים מתועדים.</div>`}
        </div>

        <div class="today-info-card">
          <div class="today-reports-header">
            <strong>דוחות למשמרת</strong>
            <button type="button" class="primary" onclick="openReportModal('${sh.id}')">${materialIcon("report")}<span>הוסף דוח</span></button>
          </div>
          ${todayReports.length
            ? `<div class="today-report-preview">${todayReports.slice(0,3).map(r=>`<span class="today-report-pill">${escapeHtml(r.eventTime||'—')} · ${escapeHtml(r.type||'ללא סוג')}</span>`).join('')}${todayReports.length>3?`<span class="today-report-pill">+${todayReports.length-3} נוספים</span>`:''}</div>`
            : `<div class="today-status">אין עדיין דוחות למשמרת הזו.</div>`}
        </div>
      </div>`;
  }

  const monthShifts=shifts.filter(sh=>sh.date.startsWith(currentYm));
  const accrued=monthShifts.filter(sh=>sh.date<=todayIso);
  const accruedTotals=dashboardTotalsForList(accrued);
  const forecastTotals=dashboardTotalsForList(monthShifts);
  const forecastNet=estimateNetDetails(forecastTotals.gross).net;
  $('dashboardMonthLabel').textContent=monthLabelHe(currentYm);
  $('dashboardAccruedGross').textContent=currency(accruedTotals.gross);
  $('dashboardAccruedMeta').textContent=`${accruedTotals.count} משמרות · ${fmtMin(accruedTotals.minutes)} שעות`;
  $('dashboardForecastGross').textContent=currency(forecastTotals.gross);
  $('dashboardForecastMeta').textContent=monthShifts.some(sh=>sh.date>todayIso)?'כולל משמרות עתידיות שכבר הוזנו':'לפי המשמרות שהוזנו עד עכשיו';
  $('dashboardForecastNet').textContent=currency(forecastNet);
  $('dashboardForecastHours').textContent=fmtMin(forecastTotals.minutes);
  $('dashboardForecastShiftCount').textContent=`${forecastTotals.count} משמרות`;
  renderDashboardAnalytics();
  renderDashboardCalendar();
  refreshLiveQuickActions();
}
function renderDashboardCalendar(){
  const ym=dashboardCalendarMonth||localDateIso().slice(0,7);
  const [y,m]=ym.split('-').map(Number);
  $('calendarTitle').textContent=monthLabelHe(ym);
  const firstDay=new Date(y,m-1,1).getDay();
  const days=new Date(y,m,0).getDate();
  const todayIso=localDateIso();
  const cells=[];

  for(let i=0;i<firstDay;i++) cells.push('<div class="calendar-day empty"></div>');

  for(let day=1;day<=days;day++){
    const date=`${ym}-${String(day).padStart(2,'0')}`;
    const items=shifts.filter(sh=>sh.date===date).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    const first=items[0];
    const events=calendarEventsForDate(date);
    const dd=first && first.ddType && first.ddNumber!=='' ? displayDdNumber(first.ddType,first.ddNumber) : '';
    const cls=['calendar-day',items.length?'has-shift':'',events.length?'has-event':'',date===todayIso?'today':''].filter(Boolean).join(' ');
    const marks=events.slice(0,3).map(ev=>`<i class="calendar-dot event-${ev.kind}" title="${escapeHtml(ev.name)}"></i>`).join('');

    cells.push(`<button type="button" class="${cls}" data-calendar-date="${date}" aria-label="${escapeHtml(date)}">
      <span class="calendar-num">${day}</span>
      ${first?`<span class="calendar-dd">${escapeHtml(dd||'משמרת')}</span>`:''}
      ${items.length>1?`<span class="calendar-more">+${items.length-1}</span>`:''}
      ${marks?`<span class="calendar-event-marks">${marks}</span>`:''}
    </button>`);
  }

  const grid=$('calendarGrid');
  grid.innerHTML=cells.join('');
  grid.querySelectorAll('[data-calendar-date]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      openDayDetails(btn.dataset.calendarDate);
    });
  });
}


function openDashboardCalendarDate(date){
  const items=shifts.filter(sh=>sh.date===date).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(items.length){ openShiftDetails(items[0].id); return; }
  editingShiftId=null;
  $('addShift').textContent='הוסף משמרת';
  $('shiftModalTitle').textContent='הוספת משמרת';
  $('date').value=date;
  $('start').value=''; $('end').value='';
  $('splitStart2').value=''; $('splitEnd2').value='';
  $('breakMin').value='0'; $('notes').value=''; $('dayType').value='auto'; updateSplitShiftUi(); $('bonus').value='0';
  $('extraLoopType').value='none'; $('nightLineType').value='none';
  $('ddPreset').value='';
  refreshDdPresetOptions();
  openShiftModal(false);
}
if($('saveNotificationPreferences')) $('saveNotificationPreferences').onclick=()=>{ saveNotificationPreferences(); alert('הגדרות ההתראות נשמרו.'); setTimeout(()=>window.dispatchEvent(new CustomEvent('salary-notification-settings-changed')),0); };
loadNotificationPreferences();
if($('enableBiometricLock')) $('enableBiometricLock').onclick=registerBiometricLock;
if($('disableBiometricLock')) $('disableBiometricLock').onclick=disableBiometricLock;
/* v43: unlock button uses direct onclick fallback so it remains responsive on the lock screen */

if($('shiftValueDate')){
  $('shiftValueDate').value=localDateIso();
  $('shiftValueDate').onchange=refreshShiftValueDdOptions;
}
if($('shiftValueLine')) $('shiftValueLine').onchange=refreshShiftValueDdOptions;
refreshShiftValueDdOptions();
if($('calculateShiftValue')) $('calculateShiftValue').onclick=calculateShiftValue;
if($('clearShiftValue')) $('clearShiftValue').onclick=clearShiftValue;
$('calendarPrev').onclick=()=>{dashboardCalendarMonth=addMonthsToYm(dashboardCalendarMonth||localDateIso().slice(0,7),-1);renderDashboardCalendar();};
$('calendarNext').onclick=()=>{dashboardCalendarMonth=addMonthsToYm(dashboardCalendarMonth||localDateIso().slice(0,7),1);renderDashboardCalendar();};
setInterval(()=>{ if(!$('todayDashboard').classList.contains('hidden') || !$('mainDashboard').classList.contains('hidden')) renderTodayDashboard(); },60000);

$('exportPdfBtn').onclick=exportMonthlyPdf;


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
