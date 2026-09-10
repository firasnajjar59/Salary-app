function defaultLinePoints(line){
  if(line==='red') return ['נווה יעקב','הדסה עין כרם'];
  if(line==='yellow') return ['טורים','מלחה'];
  return [];
}
function normalizeLinePoints(points,line=''){
  const source=Array.isArray(points)?points:defaultLinePoints(line);
  return [...new Set(source.map(x=>String(x||'').trim()).filter(Boolean))];
}
function getSettings(){
  let s={};
  settingIds.forEach(id=>{
    const el=$(id);
    s[id]=el.type==='checkbox'?el.checked:el.value;
  });
  const current=readStoredSettings();
  const lineOperationalSettings={...(current.lineOperationalSettings||{})};
  document.querySelectorAll('[data-line-op-key]').forEach(card=>{
    const key=card.dataset.lineOpKey;
    const planned=Math.max(1,Math.round(Number(card.querySelector('[data-line-op-planned]')?.value||68)));
    const tolerance=Math.max(0,Math.round(Number(card.querySelector('[data-line-op-tolerance]')?.value||1)));
    const points=[...card.querySelectorAll('[data-line-point]')].map(el=>el.value.trim()).filter(Boolean);
    lineOperationalSettings[key]={
      ...(lineOperationalSettings[key]||{}),
      plannedTripMinutes:planned,
      onTimeToleranceMinutes:tolerance,
      points:normalizeLinePoints(points,key)
    };
  });
  s.lineOperationalSettings=lineOperationalSettings;
  return s;
}
function lineOperationalConfig(line='red'){
  const s=readStoredSettings();
  const x=s.lineOperationalSettings?.[line]||{};
  return {
    plannedTripMinutes:Math.max(1,Math.round(Number(x.plannedTripMinutes||68))),
    onTimeToleranceMinutes:Math.max(0,Math.round(Number(x.onTimeToleranceMinutes??1))),
    points:normalizeLinePoints(x.points,line)
  };
}
function linePoints(line='red'){ return lineOperationalConfig(line).points; }
function linePointRow(point=''){
  return `<div class="line-point-row">
    <input data-line-point type="text" maxlength="80" value="${escapeHtml(point)}" placeholder="שם נקודת קצה">
    <button type="button" class="line-point-remove" data-remove-line-point aria-label="הסר נקודה">×</button>
  </div>`;
}
function bindLineOperationalCard(card){
  card.querySelectorAll('[data-remove-line-point]').forEach(btn=>btn.onclick=()=>{
    btn.closest('.line-point-row')?.remove();
    markSettingsDirty();
  });
  card.querySelector('[data-add-line-point]')?.addEventListener('click',()=>{
    const list=card.querySelector('[data-line-points-list]');
    if(!list) return;
    list.insertAdjacentHTML('beforeend',linePointRow(''));
    bindLineOperationalCard(card);
    list.querySelector('.line-point-row:last-child input')?.focus();
    markSettingsDirty();
  },{once:true});
}
function renderLineOperationalSettings(){
  const host=$('lineOperationalSettingsList'); if(!host)return;
  const s=readStoredSettings();
  host.innerHTML=availableLines().map(({key,label})=>{
    const x=s.lineOperationalSettings?.[key]||{};
    const planned=Math.max(1,Math.round(Number(x.plannedTripMinutes||68)));
    const tolerance=Math.max(0,Math.round(Number(x.onTimeToleranceMinutes??1)));
    const points=normalizeLinePoints(x.points,key);
    return `<div class="line-op-card" data-line-op-key="${escapeHtml(key)}">
      <div class="line-op-title">קו ${escapeHtml(label)}</div>
      <div class="line-op-grid">
        <div><label>אורך חצי סיבוב מתוכנן (דקות)</label><input data-line-op-planned type="number" min="1" step="1" value="${planned}"></div>
        <div><label>טווח שנחשב בזמן ± (דקות)</label><input data-line-op-tolerance type="number" min="0" step="1" value="${tolerance}"></div>
      </div>
      <div class="line-points-head">
        <div><strong>נקודות קצה / תחילת סיבוב</strong><div class="note">הנהג יכול לבחור אחת מהן בתחילת סיבוב, או להשאיר ריק ולעדכן אחר כך.</div></div>
        <button type="button" class="secondary line-point-add" data-add-line-point>הוסף נקודה</button>
      </div>
      <div class="line-points-list" data-line-points-list>${points.map(linePointRow).join('')}</div>
      <div class="note" style="margin-top:8px">לדוגמה: ±1 אומר שסטייה של עד דקה מוקדם או מאוחר עדיין נחשבת בזמן.</div>
    </div>`;
  }).join('');
  host.querySelectorAll('[data-line-op-key]').forEach(bindLineOperationalCard);
}
function suggestedNextTripPoint(sh){
  const points=linePoints(shiftLine(sh)); if(points.length<2) return '';
  const trips=normalizedTrips(sh).filter(t=>String(t.startPoint||'').trim());
  if(!trips.length) return '';
  const current=String(trips[trips.length-1].startPoint||'').trim();
  const i=points.indexOf(current); if(i<0) return '';
  return points[(i+1)%points.length]||'';
}
function populateTripStartPoints(sh,selected='',suggest=false){
  const el=$('tripStartPoint'); if(!el) return;
  const points=linePoints(shiftLine(sh));
  const chosen=selected||((suggest)?suggestedNextTripPoint(sh):'');
  const values=[...points]; if(chosen&&!values.includes(chosen)) values.push(chosen);
  el.innerHTML=`<option value="">לא חובה — אפשר לבחור אחר כך</option>`+
    values.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  el.value=chosen||'';
}
function saveSettings(){
  const current=readStoredSettings();
  const next={...current,...getSettings(),homeLayout:normalizeHomeLayout(homeLayoutDraft.length?homeLayoutDraft:current.homeLayout),analyticsChartLayout:normalizeAnalyticsChartLayout(analyticsChartLayoutDraft.length?analyticsChartLayoutDraft:(current.analyticsChartLayout===undefined?defaultAnalyticsChartLayout():current.analyticsChartLayout))};
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(next));
}
function loadSettings(){
  const s=readStoredSettings();
  settingIds.forEach(id=>{
    if(s[id]!==undefined){
      const el=$(id);
      if(el.type==='checkbox') el.checked=!!s[id]; else el.value=s[id];
    }
  });
  homeLayoutDraft=normalizeHomeLayout(s.homeLayout);
  analyticsChartLayoutDraft=s.analyticsChartLayout===undefined?defaultAnalyticsChartLayout():normalizeAnalyticsChartLayout(s.analyticsChartLayout);
  applyHomeLayout(homeLayoutDraft);
  applyAnalyticsChartLayout(analyticsChartLayoutDraft);
  renderHomeLayoutEditor();
  renderAnalyticsChartLayoutEditor();
  renderReportTypesSettings();
  renderLineOperationalSettings();
}

const DEFAULT_NOTIFICATION_PREFERENCES={
  shift:{enabled:false,leadMinutes:60},
  monthly:{enabled:false,day:1,time:'14:00'},
  weekly:{enabled:false,day:0,time:'18:00'}
};

function getNotificationPreferences(){
  const s=readStoredSettings();
  const raw=s.notificationPreferences||{};
  return {
    shift:{
      enabled:!!raw.shift?.enabled,
      leadMinutes:Number(raw.shift?.leadMinutes||DEFAULT_NOTIFICATION_PREFERENCES.shift.leadMinutes)
    },
    monthly:{
      enabled:!!raw.monthly?.enabled,
      day:Math.min(28,Math.max(1,Number(raw.monthly?.day||DEFAULT_NOTIFICATION_PREFERENCES.monthly.day))),
      time:raw.monthly?.time||DEFAULT_NOTIFICATION_PREFERENCES.monthly.time
    },
    weekly:{
      enabled:!!raw.weekly?.enabled,
      day:Math.min(6,Math.max(0,Number(raw.weekly?.day??DEFAULT_NOTIFICATION_PREFERENCES.weekly.day))),
      time:raw.weekly?.time||DEFAULT_NOTIFICATION_PREFERENCES.weekly.time
    }
  };
}

function loadNotificationPreferences(){
  const p=getNotificationPreferences();
  if($('notifyShiftEnabled')) $('notifyShiftEnabled').checked=p.shift.enabled;
  if($('notifyShiftLead')) $('notifyShiftLead').value=String(p.shift.leadMinutes);
  if($('notifyMonthlyEnabled')) $('notifyMonthlyEnabled').checked=p.monthly.enabled;
  if($('notifyMonthlyDay')) $('notifyMonthlyDay').value=String(p.monthly.day);
  if($('notifyMonthlyTime')) $('notifyMonthlyTime').value=p.monthly.time;
  if($('notifyWeeklyEnabled')) $('notifyWeeklyEnabled').checked=p.weekly.enabled;
  if($('notifyWeeklyDay')) $('notifyWeeklyDay').value=String(p.weekly.day);
  if($('notifyWeeklyTime')) $('notifyWeeklyTime').value=p.weekly.time;
}

function saveNotificationPreferences(){
  const current=readStoredSettings();
  const next={
    ...current,
    notificationPreferences:{
      shift:{
        enabled:!!$('notifyShiftEnabled')?.checked,
        leadMinutes:Number($('notifyShiftLead')?.value||60)
      },
      monthly:{
        enabled:!!$('notifyMonthlyEnabled')?.checked,
        day:Math.min(28,Math.max(1,Number($('notifyMonthlyDay')?.value||1))),
        time:$('notifyMonthlyTime')?.value||'14:00'
      },
      weekly:{
        enabled:!!$('notifyWeeklyEnabled')?.checked,
        day:Math.min(6,Math.max(0,Number($('notifyWeeklyDay')?.value||0))),
        time:$('notifyWeeklyTime')?.value||'18:00'
      }
    }
  };
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(next));
  loadNotificationPreferences();
}

function activateTabById(tabId){
  const btn=document.querySelector(`.tab[data-tab="${tabId}"]`);
  if(btn) btn.click();
}

function openDeepLinkFromUrl(){
  try{
    const u=new URL(location.href);
    const view=u.searchParams.get('view');
    if(!view) return;

    if(view==='summary'){
      const month=u.searchParams.get('month');
      activateTabById('summary');
      if(month && /^\d{4}-\d{2}$/.test(month)){
        $('monthFilter').value=month;
        renderSummary();
      }
    }else if(view==='shift'){
      const id=u.searchParams.get('id');
      activateTabById('shifts');
      if(id){
        const sh=shifts.find(x=>x.id===id);
        if(sh) setTimeout(()=>openShiftDetails(id),50);
      }
    }

    // Keep the normal app URL after handling the deep link.
    u.search='';
    history.replaceState({},'',u.toString());
  }catch(e){
    console.warn('Deep link handling failed',e);
  }
}


