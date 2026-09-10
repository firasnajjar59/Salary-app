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

