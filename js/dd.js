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

