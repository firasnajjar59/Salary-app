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

