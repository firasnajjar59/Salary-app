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

