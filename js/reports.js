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

