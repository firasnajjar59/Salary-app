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

