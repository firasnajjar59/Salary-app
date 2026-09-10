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

