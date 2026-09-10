const APP_THEME_KEY='salaryApp.theme.v1';
function getAppThemePrefs(){try{return Object.assign({mode:'light',color:'blue'},JSON.parse(localStorage.getItem(APP_THEME_KEY)||'{}'))}catch(_){return {mode:'light',color:'blue'}}}
function resolvedAppTheme(m){return m==='system'&&window.matchMedia? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m}
function applyAppTheme(){const p=getAppThemePrefs();document.documentElement.dataset.theme=resolvedAppTheme(p.mode);document.documentElement.dataset.appColor=p.color;document.querySelectorAll('[data-theme-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.themeMode===p.mode));document.querySelectorAll('[data-app-color]').forEach(b=>b.classList.toggle('selected',b.dataset.appColor===p.color))}
function setAppThemeMode(mode){const p=getAppThemePrefs();p.mode=mode;localStorage.setItem(APP_THEME_KEY,JSON.stringify(p));applyAppTheme()}
function setAppAccentColor(color){const p=getAppThemePrefs();p.color=color;localStorage.setItem(APP_THEME_KEY,JSON.stringify(p));applyAppTheme()}
if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: dark)');const f=()=>{if(getAppThemePrefs().mode==='system')applyAppTheme()};mq.addEventListener?mq.addEventListener('change',f):mq.addListener(f)}
document.addEventListener('DOMContentLoaded',applyAppTheme);applyAppTheme();

const VERSION_URL='./version.json';
const GOOGLE_CLIENT_ID='671607022405-ctegk4jl7koo9elm30odvsb1binp49cb.apps.googleusercontent.com';
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const DRIVE_BACKUP_FILE='salary-app-backup.json';
const KEY_DRIVE_BACKUP='salaryApp.driveBackup.v1';
let driveTokenClient=null;
let driveAccessToken='';
let driveTokenExpiresAt=0;
let drivePendingAction=null;

const HOME_WIDGETS=[
  {id:'forecast',label:'תחזית שכר'},
  {id:'calendar',label:'לוח שנה'},
  {id:'analytics',label:'השוואה וגרפים'},
  {id:'shiftValue',label:'כמה שווה לי משמרת?'}
];
let homeLayoutDraft=[];

const ANALYTICS_CHARTS=[
  {id:'gross',label:'ברוטו'},
  {id:'net',label:'נטו משוער'},
  {id:'hours',label:'שעות עבודה'},
  {id:'regular',label:'שעות רגילות'},
  {id:'ot125',label:'שעות 125%'},
  {id:'ot150',label:'שעות 150%'},
  {id:'saturday',label:'שעות שבת 225%'},
  {id:'night',label:'שעות לילה'}
];
let analyticsChartLayoutDraft=[];
function defaultAnalyticsChartLayout(){ return ANALYTICS_CHARTS.map((c,i)=>({id:c.id,visible:i<3})); }
function normalizeAnalyticsChartLayout(value){
  const incoming=Array.isArray(value)?value:[];
  const result=[]; const seen=new Set();
  incoming.forEach(item=>{
    const id=typeof item==='string'?item:item?.id;
    if(!ANALYTICS_CHARTS.some(c=>c.id===id) || seen.has(id)) return;
    result.push({id,visible:typeof item==='string'?true:item.visible!==false});
    seen.add(id);
  });
  ANALYTICS_CHARTS.forEach((c,i)=>{ if(!seen.has(c.id)) result.push({id:c.id,visible:incoming.length?false:i<3}); });
  return result;
}
function getSavedAnalyticsChartLayout(){
  const s=readStoredSettings();
  return s.analyticsChartLayout===undefined?defaultAnalyticsChartLayout():normalizeAnalyticsChartLayout(s.analyticsChartLayout);
}
function applyAnalyticsChartLayout(layout=getSavedAnalyticsChartLayout()){
  const container=$('analyticsChartsContainer'); if(!container) return;
  const normalized=normalizeAnalyticsChartLayout(layout);
  normalized.forEach(item=>{
    const el=container.querySelector(`[data-analytics-chart="${item.id}"]`);
    if(!el) return;
    el.classList.toggle('analytics-chart-hidden',!item.visible);
    container.appendChild(el);
  });
}
function renderAnalyticsChartLayoutEditor(){
  const list=$('analyticsChartLayoutList'); if(!list) return;
  if(!analyticsChartLayoutDraft.length) analyticsChartLayoutDraft=getSavedAnalyticsChartLayout();
  list.innerHTML=analyticsChartLayoutDraft.map((item,index)=>{
    const def=ANALYTICS_CHARTS.find(c=>c.id===item.id);
    return `<div class="analytics-chart-row">
      <label class="analytics-chart-main"><input type="checkbox" data-chart-visible="${item.id}" ${item.visible?'checked':''}><span>${escapeHtml(def?.label||item.id)}</span></label>
      <div class="analytics-chart-actions">
        <button type="button" class="analytics-chart-move" data-chart-move="up" data-chart-id="${item.id}" ${index===0?'disabled':''}>↑</button>
        <button type="button" class="analytics-chart-move" data-chart-move="down" data-chart-id="${item.id}" ${index===analyticsChartLayoutDraft.length-1?'disabled':''}>↓</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-chart-visible]').forEach(cb=>cb.onchange=()=>{
    const item=analyticsChartLayoutDraft.find(x=>x.id===cb.dataset.chartVisible);
    if(item) item.visible=cb.checked;
    applyAnalyticsChartLayout(analyticsChartLayoutDraft);
  });
  list.querySelectorAll('[data-chart-move]').forEach(btn=>btn.onclick=()=>{
    const i=analyticsChartLayoutDraft.findIndex(x=>x.id===btn.dataset.chartId);
    const target=btn.dataset.chartMove==='up'?i-1:i+1;
    if(i<0 || target<0 || target>=analyticsChartLayoutDraft.length) return;
    [analyticsChartLayoutDraft[i],analyticsChartLayoutDraft[target]]=[analyticsChartLayoutDraft[target],analyticsChartLayoutDraft[i]];
    renderAnalyticsChartLayoutEditor();
    applyAnalyticsChartLayout(analyticsChartLayoutDraft);
  });
}
function saveAnalyticsChartLayout(){
  const current=readStoredSettings();
  current.analyticsChartLayout=normalizeAnalyticsChartLayout(analyticsChartLayoutDraft.length?analyticsChartLayoutDraft:getSavedAnalyticsChartLayout());
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(current));
  analyticsChartLayoutDraft=current.analyticsChartLayout.map(x=>({...x}));
  applyAnalyticsChartLayout(analyticsChartLayoutDraft);
}

function defaultHomeLayout(){ return HOME_WIDGETS.map(w=>({id:w.id,visible:true})); }
function normalizeHomeLayout(value){
  const incoming=Array.isArray(value)?value:[];
  const result=[];
  const seen=new Set();
  incoming.forEach(item=>{
    const id=typeof item==='string'?item:item?.id;
    if(!HOME_WIDGETS.some(w=>w.id===id) || seen.has(id)) return;
    result.push({id,visible:typeof item==='string'?true:item.visible!==false});
    seen.add(id);
  });
  HOME_WIDGETS.forEach(w=>{ if(!seen.has(w.id)) result.push({id:w.id,visible:true}); });
  return result;
}
function readStoredSettings(){
  try{
    const s=JSON.parse(localStorage.getItem(KEY_SETTINGS)||'{}');
    return s && typeof s==='object' && !Array.isArray(s) ? s : {};
  }catch(e){ return {}; }
}
function getSavedHomeLayout(){ return normalizeHomeLayout(readStoredSettings().homeLayout); }
function applyHomeLayout(layout=getSavedHomeLayout()){
  const normalized=normalizeHomeLayout(layout);
  const section=$('mainDashboard');
  if(!section) return;
  let visibleCount=0;
  normalized.forEach(item=>{
    const el=section.querySelector(`[data-home-widget="${item.id}"]`);
    if(!el) return;
    el.classList.toggle('hidden',!item.visible);
    if(item.visible) visibleCount++;
    section.appendChild(el);
  });
  const empty=$('dashboardEmptyState');
  if(empty){
    empty.classList.toggle('hidden',visibleCount>0);
    section.appendChild(empty);
  }
}
function renderHomeLayoutEditor(){
  const list=$('homeLayoutList');
  if(!list) return;
  if(!homeLayoutDraft.length) homeLayoutDraft=getSavedHomeLayout();
  list.innerHTML=homeLayoutDraft.map((item,index)=>{
    const def=HOME_WIDGETS.find(w=>w.id===item.id);
    return `<div class="home-layout-row">
      <label class="home-layout-main"><input type="checkbox" data-home-visible="${item.id}" ${item.visible?'checked':''}><span>${escapeHtml(def?.label||item.id)}</span></label>
      <div class="home-layout-actions">
        <button type="button" class="home-layout-move" data-home-move="up" data-home-id="${item.id}" ${index===0?'disabled':''} aria-label="העבר למעלה">↑</button>
        <button type="button" class="home-layout-move" data-home-move="down" data-home-id="${item.id}" ${index===homeLayoutDraft.length-1?'disabled':''} aria-label="העבר למטה">↓</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-home-visible]').forEach(cb=>cb.onchange=()=>{
    const item=homeLayoutDraft.find(x=>x.id===cb.dataset.homeVisible);
    if(item) item.visible=cb.checked;
    applyHomeLayout(homeLayoutDraft);
  });
  list.querySelectorAll('[data-home-move]').forEach(btn=>btn.onclick=()=>{
    const i=homeLayoutDraft.findIndex(x=>x.id===btn.dataset.homeId);
    if(i<0) return;
    const target=btn.dataset.homeMove==='up'?i-1:i+1;
    if(target<0 || target>=homeLayoutDraft.length) return;
    [homeLayoutDraft[i],homeLayoutDraft[target]]=[homeLayoutDraft[target],homeLayoutDraft[i]];
    renderHomeLayoutEditor();
    applyHomeLayout(homeLayoutDraft);
  });
}
function saveHomeLayout(){
  const current=readStoredSettings();
  current.homeLayout=normalizeHomeLayout(homeLayoutDraft.length?homeLayoutDraft:getSavedHomeLayout());
  localStorage.setItem(KEY_SETTINGS,JSON.stringify(current));
  homeLayoutDraft=current.homeLayout.map(x=>({...x}));
  applyHomeLayout(homeLayoutDraft);
}

function shiftSignature(sh){
  return [
    sh.date||'', sh.start||'', sh.end||'', String(sh.breakMin||0), String(sh.notes||''),
    sh.dayType||'auto', sh.splitEnd1||'', sh.splitStart2||'', sh.splitEnd2||'', String(!!sh.splitDidNotReturn), String(sh.bonus||0),
    sh.extraLoopType||'none', sh.nightLineType||'none',
    shiftLine(sh), sh.ddType||'', String(sh.ddNumber||'')
  ].join('|');
}

function dedupeShifts(list){
  const seen=new Set();
  return (Array.isArray(list)?list:[]).filter(sh=>{
    const sig=shiftSignature(sh);
    if(seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

let rawShifts=[];
try{
  rawShifts=JSON.parse(localStorage.getItem(KEY_SHIFTS)||'[]');
}catch(e){
  rawShifts=[];
}
let shifts=dedupeShifts(rawShifts);

