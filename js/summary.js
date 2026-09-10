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




