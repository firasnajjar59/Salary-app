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

