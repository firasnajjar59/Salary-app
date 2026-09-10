function exportMonthlyPdf(){
  const month=$('monthFilter').value;
  const filtered=(month?shifts.filter(s=>s.date.startsWith(month)):shifts)
    .slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
  const travelInfo=monthlyTravelForShifts(filtered);

  if(!filtered.length){
    alert('אין משמרות בחודש שנבחר.');
    return;
  }

  const rows=filtered.map(sh=>{
    const c=calcShift(sh);
    const specialText=specialDescription(sh);
    const extraPayments=c.travel+c.perDiem+c.specialPay+c.bonus+c.nightExtra;
    return `
      <tr>
        <td>${escapeHtml(formatDateHe(sh.date))}</td>
        <td>${escapeHtml(dayNameHe(sh.date))}</td>
        <td>
          ${escapeHtml(sh.start)}-${escapeHtml(sh.end)}
          ${(sh.ddType && sh.ddNumber!=='')?`<div class="small">${escapeHtml(displayShiftDd(sh))}</div>`:''}${sh.notes?`<div class="small">${escapeHtml(sh.notes)}</div>`:''}
        </td>
        <td>${fmtMin(c.grossMinutes)}</td>
        <td>${fmtMin(c.regMin)}</td>
        <td>${fmtMin(c.ot1Min)}</td>
        <td>${fmtMin(c.ot2Min)}</td>
        <td>${fmtMin(c.nightMin)}</td>
        <td>${currency(c.regPay)}</td>
        <td>${currency(c.ot1Pay+c.ot2Pay)}</td>
        <td>
          ${currency(extraPayments)}
          ${specialText?`<div class="small">${escapeHtml(specialText)}</div>`:''}
        </td>
        <td class="total">${currency(c.pay)}</td>
      </tr>`;
  }).join('');

  const totals={
    grossMinutes:0,regMin:0,ot1Min:0,ot2Min:0,nightMin:0,
    regPay:0,otPay:0,nightExtra:0,travel:0,perDiem:0,specialPay:0,bonus:0,pay:0
  };

  filtered.forEach(sh=>{
    const c=calcShift(sh);
    totals.grossMinutes+=c.grossMinutes;
    totals.regMin+=c.regMin;
    totals.ot1Min+=c.ot1Min;
    totals.ot2Min+=c.ot2Min;
    totals.nightMin+=c.nightMin;
    totals.regPay+=c.regPay;
    totals.otPay+=c.ot1Pay+c.ot2Pay;
    totals.nightExtra+=c.nightExtra;
    totals.perDiem+=c.perDiem;
    totals.specialPay+=c.specialPay;
    totals.bonus+=c.bonus;
    totals.pay+=c.pay-c.travel;
  });
  totals.travel=travelInfo.paid;
  totals.pay+=travelInfo.paid;

  const net=estimateNetDetails(totals.pay);
  const monthTitle=month
    ? new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(new Date(month+'-01T12:00:00'))
    : 'כל התקופה';

  const reportHtml=`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>דוח שעות ושכר - ${escapeHtml(monthTitle)}</title>
<style>
  @page{size:A4 landscape;margin:9mm}
  *{box-sizing:border-box}
  body{font-family:Arial,"Segoe UI",sans-serif;color:#111;margin:0;direction:rtl;font-size:10px}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#555;margin-bottom:14px;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:12px}
  .box{border:1px solid #d8dbe2;border-radius:8px;padding:8px}
  .box b{display:block;font-size:14px;margin-top:3px}
  table{width:100%;border-collapse:collapse;table-layout:auto}
  th,td{border:1px solid #d8dbe2;padding:5px 4px;text-align:center;vertical-align:middle}
  th{background:#f1f3f6;font-weight:700}
  tbody tr:nth-child(even){background:#fafafa}
  .small{font-size:8px;color:#555;margin-top:2px;line-height:1.25}
  .total{font-weight:700}
  .pay-summary{margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .pay-summary .box{min-height:54px}
  .net{background:#111827;color:white;border-color:#111827}
  .note{margin-top:9px;font-size:8.5px;color:#666}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    button{display:none!important}
  }
</style>
</head>
<body>
  <h1>דוח שעות ושכר</h1>
  <div class="sub">${escapeHtml(monthTitle)} · ${filtered.length} משמרות</div>

  <div class="summary">
    <div class="box">סה"כ שעות<b>${fmtMin(totals.grossMinutes)}</b></div>
    <div class="box">שעות רגילות<b>${fmtMin(totals.regMin)}</b></div>
    <div class="box">125%<b>${fmtMin(totals.ot1Min)}</b></div>
    <div class="box">150%<b>${fmtMin(totals.ot2Min)}</b></div>
    <div class="box">שעות לילה<b>${fmtMin(totals.nightMin)}</b></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>תאריך</th>
        <th>יום</th>
        <th>משמרת</th>
        <th>סה"כ שעות</th>
        <th>רגילות</th>
        <th>125%</th>
        <th>150%</th>
        <th>לילה</th>
        <th>שכר רגיל</th>
        <th>שעות נוספות</th>
        <th>תשלומים נוספים</th>
        <th>סה"כ למשמרת</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="pay-summary">
    <div class="box">נסיעות<b>${currency(totals.travel)}</b><span class="small">${travelInfo.workDays} ימים × ${currency(travelInfo.perDay)}${travelInfo.cap>0?` · תקרה ${currency(travelInfo.cap)}`:''}</span></div>
    <div class="box">אש"ל<b>${currency(totals.perDiem)}</b></div>
    <div class="box">תוספות מיוחדות<b>${currency(totals.specialPay)}</b></div>
    <div class="box">תוספת לילה<b>${currency(totals.nightExtra)}</b></div>
    <div class="box">תוספות ידניות<b>${currency(totals.bonus)}</b></div>
    <div class="box">ברוטו מחושב<b>${currency(totals.pay)}</b></div>
    <div class="box">מס הכנסה<b>${currency(net.tax)}</b></div>
    <div class="box">ביטוח לאומי<b>${currency(net.nationalInsurance)}</b></div>
    <div class="box">ביטוח בריאות<b>${currency(net.healthInsurance)}</b></div>
    <div class="box">פנסיה עובד<b>${currency(net.pension)}</b></div>
    <div class="box">ניכוי ועד<b>${currency(net.unionDeduction)}</b></div>
    <div class="box net">נטו משוער<b>${currency(net.net)}</b></div>
  </div>

  <div class="note">
    הדוח מבוסס על הנתונים וההגדרות שהוזנו באפליקציה. מס הכנסה, ביטוח לאומי וביטוח בריאות מחושבים לפי המדרגות שבהגדרות או לפי ברירת המחדל של 2026; הנטו עדיין משוער.
  </div>

<script>
  window.onload=()=>{ setTimeout(()=>window.print(),250); };
<\/script>
</body>
</html>`;

  const reportWindow=window.open('','_blank');
  if(!reportWindow){
    alert('הדפדפן חסם את חלון הדוח. יש לאפשר חלונות קופצים ולנסות שוב.');
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
}



// v36 — Customizable Today dashboard layout
