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


