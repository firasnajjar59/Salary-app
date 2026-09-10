import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
  import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging.js";

  const PUSH_FIREBASE_CONFIG = {
    apiKey: "AIzaSyAFDEs33DVG3O_RYz_b3yaAgJ1LYmNbbRQ",
    authDomain: "salary-app-507708.firebaseapp.com",
    projectId: "salary-app-507708",
    storageBucket: "salary-app-507708.firebasestorage.app",
    messagingSenderId: "671607022405",
    appId: "1:671607022405:web:05d26d5fbe92f49870542c"
  };

  const PUSH_VAPID_KEY = "BLdjiRzsHn8cMWZLt0I1Af_hMD2mwy6HNWr40VBCHJyCmEXCG_6xl35Nt9WCp7hlhFaLNQ50Y09lOGdZRvsLE10";
  const PUSH_DEVICE_KEY = "salaryApp.pushDevice.v1";
  const PUSH_ENDPOINTS = {
    registerInstallation: "https://me-west1-salary-app-507708.cloudfunctions.net/registerInstallation",
    registerPushToken: "https://me-west1-salary-app-507708.cloudfunctions.net/registerPushToken",
    sendTestPush: "https://me-west1-salary-app-507708.cloudfunctions.net/sendTestPush",
    createReminder: "https://me-west1-salary-app-507708.cloudfunctions.net/createReminder",
    cancelReminder: "https://me-west1-salary-app-507708.cloudfunctions.net/cancelReminder"
  };

  const pushApp = initializeApp(PUSH_FIREBASE_CONFIG, "salary-app-push");
  let pushMessaging = null;

  function pushEl(id){ return document.getElementById(id); }

  function loadPushDevice(){
    try{
      const value = JSON.parse(localStorage.getItem(PUSH_DEVICE_KEY) || "null");
      return value && value.deviceId && value.deviceSecret ? value : null;
    }catch(e){
      return null;
    }
  }

  function savePushDevice(value){
    localStorage.setItem(PUSH_DEVICE_KEY, JSON.stringify(value));
  }

  function setPushStatus(text, kind="normal"){
    const el = pushEl("pushNotificationStatus");
    if(!el) return;
    el.textContent = text;
    el.style.color = kind === "error" ? "var(--danger)" : (kind === "ok" ? "var(--ok)" : "var(--muted)");
  }

  async function postPush(url, body, device=null){
    const headers = {"Content-Type":"application/json"};
    if(device?.deviceSecret) headers["X-Device-Secret"] = device.deviceSecret;
    const response = await fetch(url, {
      method:"POST",
      headers,
      body:JSON.stringify(body || {})
    });
    let data = {};
    try{ data = await response.json(); }catch(e){}
    if(!response.ok){
      const err = new Error(data.error || `HTTP ${response.status}`);
      err.code = data.error || String(response.status);
      throw err;
    }
    return data;
  }

  async function ensureAnonymousInstallation(){
    const existing = loadPushDevice();
    if(existing) return existing;

    const data = await postPush(PUSH_ENDPOINTS.registerInstallation, {});
    if(!data.deviceId || !data.deviceSecret) throw new Error("invalid_installation_response");

    const device = {
      deviceId:data.deviceId,
      deviceSecret:data.deviceSecret,
      createdAt:new Date().toISOString()
    };
    savePushDevice(device);
    localStorage.removeItem(PUSH_SYNC_CACHE_KEY);
    return device;
  }

  async function messagingSupported(){
    try{
      return !!(window.isSecureContext && "serviceWorker" in navigator && "Notification" in window && await isSupported());
    }catch(e){
      return false;
    }
  }

  async function registerPushNotifications({requestPermission=true}={}){
    if(!(await messagingSupported())) throw new Error("push_not_supported");

    if(requestPermission && Notification.permission === "default"){
      const permission = await Notification.requestPermission();
      if(permission !== "granted") throw new Error("permission_denied");
    }
    if(Notification.permission !== "granted") throw new Error("permission_denied");

    setPushStatus("רושם את המכשיר להתראות...");

    const device = await ensureAnonymousInstallation();
    const swRegistration = await navigator.serviceWorker.ready;
    if(!pushMessaging) pushMessaging = getMessaging(pushApp);

    const token = await getToken(pushMessaging, {
      vapidKey:PUSH_VAPID_KEY,
      serviceWorkerRegistration:swRegistration
    });
    if(!token) throw new Error("missing_fcm_token");

    await postPush(PUSH_ENDPOINTS.registerPushToken, {
      deviceId:device.deviceId,
      pushToken:token
    }, device);

    const updated = {
      ...device,
      pushToken:token,
      pushRegisteredAt:new Date().toISOString()
    };
    savePushDevice(updated);
    setPushStatus("ההתראות פעילות במכשיר הזה.", "ok");
    syncNotificationSchedules().catch(e=>console.warn("Reminder sync failed",e));
    const testBtn = pushEl("sendPushTest");
    if(testBtn) testBtn.disabled = false;
    return updated;
  }

  async function enablePushFromButton(){
    const btn = pushEl("enablePushNotifications");
    if(btn) btn.disabled = true;
    try{
      await registerPushNotifications({requestPermission:true});
    }catch(e){
      console.warn("Push registration failed", e);
      if(e.message === "permission_denied"){
        setPushStatus("הרשאת ההתראות לא אושרה. אפשר לאפשר אותה בהגדרות האתר בדפדפן.", "error");
      }else if(e.message === "push_not_supported"){
        setPushStatus("הדפדפן או המכשיר אינם תומכים ב-Push במצב הנוכחי.", "error");
      }else{
        setPushStatus(`רישום ההתראות נכשל: ${e.message}`, "error");
      }
    }finally{
      if(btn) btn.disabled = false;
    }
  }

  async function sendPushTest(){
    const btn = pushEl("sendPushTest");
    if(btn) btn.disabled = true;
    try{
      const device = await registerPushNotifications({requestPermission:true});
      setPushStatus("שולח התראת בדיקה...");
      await postPush(PUSH_ENDPOINTS.sendTestPush, {
        deviceId:device.deviceId
      }, device);
      setPushStatus("התראת הבדיקה נשלחה. היא אמורה להופיע תוך כמה שניות.", "ok");
    }catch(e){
      console.warn("Test push failed", e);
      setPushStatus(`שליחת הבדיקה נכשלה: ${e.message}`, "error");
    }finally{
      if(btn) btn.disabled = false;
    }
  }



  const PUSH_SYNC_CACHE_KEY = "salaryApp.pushReminderSync.v1";

  function loadReminderSyncCache(){
    try{ return JSON.parse(localStorage.getItem(PUSH_SYNC_CACHE_KEY)||"{}")||{}; }
    catch(e){ return {}; }
  }

  function saveReminderSyncCache(cache){
    localStorage.setItem(PUSH_SYNC_CACHE_KEY,JSON.stringify(cache||{}));
  }

  function stableFingerprint(payload){
    const raw = JSON.stringify({
      type:payload.type||"",
      referenceId:payload.referenceId||"",
      title:payload.title||"",
      body:payload.body||"",
      sendAt:payload.sendAt||"",
      deepLink:payload.deepLink||""
    });
    let h=2166136261;
    for(let i=0;i<raw.length;i++){
      h^=raw.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return (h>>>0).toString(16);
  }

  async function createServerReminderIfChanged(device,payload){
    const cache=loadReminderSyncCache();
    const key=`${payload.type}|${payload.referenceId||""}`;
    const fp=stableFingerprint(payload);
    if(cache[key]===fp) return {ok:true,skipped:true};

    const result=await createServerReminder(device,payload);
    if(result?.ok){
      cache[key]=fp;
      saveReminderSyncCache(cache);
    }
    return result;
  }

  function clearReminderSyncCacheEntry(type,referenceId){
    const cache=loadReminderSyncCache();
    const key=`${type}|${referenceId||""}`;
    if(Object.prototype.hasOwnProperty.call(cache,key)){
      delete cache[key];
      saveReminderSyncCache(cache);
    }
  }

  function pushPrefs(){
    try{
      const s=JSON.parse(localStorage.getItem("salaryApp.settings.v1")||"{}");
      return s.notificationPreferences||{};
    }catch(e){ return {}; }
  }

  function allLocalShifts(){
    try{ return JSON.parse(localStorage.getItem("salaryApp.shifts.v1")||"[]")||[]; }
    catch(e){ return []; }
  }

  function localDateTime(dateStr,timeStr){
    if(!dateStr||!timeStr) return null;
    const dm=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
    const tm=/^(\d{1,2}):(\d{2})$/.exec(String(timeStr));
    if(!dm||!tm) return null;
    const totalMinutes=Number(tm[1])*60+Number(tm[2]);
    if(!Number.isFinite(totalMinutes)) return null;
    const d=new Date(Number(dm[1]),Number(dm[2])-1,Number(dm[3]),0,0,0,0);
    d.setMinutes(totalMinutes);
    return Number.isNaN(d.getTime())?null:d;
  }

  function previousMonthKey(now=new Date()){
    const d=new Date(now.getFullYear(),now.getMonth()-1,1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function nextMonthlyOccurrence(day,time){
    const [hh,mm]=(time||"14:00").split(":").map(Number);
    const now=new Date();
    let d=new Date(now.getFullYear(),now.getMonth(),Math.min(28,Number(day)||1),hh||0,mm||0,0,0);
    if(d<=now) d=new Date(now.getFullYear(),now.getMonth()+1,Math.min(28,Number(day)||1),hh||0,mm||0,0,0);
    return d;
  }

  function nextWeeklyOccurrence(day,time){
    const [hh,mm]=(time||"18:00").split(":").map(Number);
    const now=new Date();
    const targetDay=Number(day)||0; // UI: 0 Sunday ... 6 Saturday, same as JS.
    let d=new Date(now);
    d.setHours(hh||0,mm||0,0,0);
    let add=(targetDay-d.getDay()+7)%7;
    if(add===0 && d<=now) add=7;
    d.setDate(d.getDate()+add);
    return d;
  }

  function shiftRef(sh){
    // Existing shifts already have id; fallback only protects older imported data.
    return String(sh.id || `${sh.date}|${sh.start}|${sh.end}|${sh.ddType||""}|${sh.ddNumber||""}`);
  }

  function shiftDdLabel(sh){
    if(sh.ddNumber===undefined || sh.ddNumber===null || sh.ddNumber==="") return "";
    const prefix=String(sh.ddType||"DD").toUpperCase();
    return `${prefix}${sh.ddNumber}`;
  }

  async function createServerReminder(device,payload){
    return postPush(PUSH_ENDPOINTS.createReminder,{
      deviceId:device.deviceId,...payload
    },device);
  }

  async function cancelServerReminder(device,type,referenceId){
    const result=await postPush(PUSH_ENDPOINTS.cancelReminder,{
      deviceId:device.deviceId,type,referenceId
    },device);
    if(result?.ok) clearReminderSyncCacheEntry(type,referenceId);
    return result;
  }


  async function syncOneShiftReminder(shiftId){
    const device=loadPushDevice();
    if(!device?.deviceId || !device?.deviceSecret || Notification.permission!=="granted") return;

    const p=pushPrefs();
    const ref=String(shiftId||"");
    if(!ref) return;

    if(!p.shift?.enabled){
      await cancelServerReminder(device,"shift",ref).catch(()=>{});
      return;
    }

    const sh=allLocalShifts().find(x=>String(x.id)===ref);
    if(!sh){
      await cancelServerReminder(device,"shift",ref).catch(()=>{});
      return;
    }

    const lead=Math.max(1,Number(p.shift.leadMinutes||60));
    const start=localDateTime(sh.date,sh.start);
    if(!start) return;

    const sendAt=new Date(start.getTime()-lead*60000);
    if(sendAt.getTime()<=Date.now()){
      await cancelServerReminder(device,"shift",ref).catch(()=>{});
      return;
    }

    const dd=shiftDdLabel(sh);
    const leadText=lead<60?`${lead} דקות`:lead===60?"שעה":lead%60===0?`${lead/60} שעות`:`${lead} דקות`;

    await createServerReminderIfChanged(device,{
      type:"shift",
      referenceId:ref,
      title:"תזכורת למשמרת",
      body:`המשמרת שלך מתחילה בעוד ${leadText}${dd?" · "+dd:""} · ${sh.start}`,
      sendAt:sendAt.toISOString(),
      deepLink:""
    });
  }

  async function cancelAllCurrentShiftReminders(){
    const device=loadPushDevice();
    if(!device?.deviceId || !device?.deviceSecret) return;
    for(const sh of allLocalShifts()){
      const ref=shiftRef(sh);
      await cancelServerReminder(device,"shift",ref).catch(()=>{});
    }
  }

  async function syncNotificationSchedules(){
    const device=loadPushDevice();
    if(!device?.deviceId || !device?.deviceSecret || Notification.permission!=="granted") return;

    const p=pushPrefs();
    const now=Date.now();

    // SHIFT REMINDERS
    const shifts=allLocalShifts();
    if(p.shift?.enabled){
      const lead=Math.max(1,Number(p.shift.leadMinutes||60));
      for(const sh of shifts){
        const start=localDateTime(sh.date,sh.start);
        if(!start) continue;
        const sendAt=new Date(start.getTime()-lead*60000);
        if(sendAt.getTime()<=now) continue;
        const ref=shiftRef(sh);
        const dd=shiftDdLabel(sh);
        const body=`המשמרת שלך מתחילה בעוד ${lead<60?lead+" דקות":lead===60?"שעה":lead%60===0?(lead/60)+" שעות":lead+" דקות"}${dd?" · "+dd:""} · ${sh.start}`;
        await createServerReminderIfChanged(device,{
          type:"shift",
          referenceId:ref,
          title:"תזכורת למשמרת",
          body,
          sendAt:sendAt.toISOString(),
          deepLink:""
        });
      }
    }else{
      await cancelAllCurrentShiftReminders();
    }

    // MONTHLY SUMMARY: keep one upcoming occurrence. When app is opened later,
    // deterministic replacement advances it to the next month.
    if(p.monthly?.enabled){
      const sendAt=nextMonthlyOccurrence(p.monthly.day||1,p.monthly.time||"14:00");
      const monthKey=previousMonthKey(sendAt);
      await createServerReminderIfChanged(device,{
        type:"monthly_summary",
        referenceId:"monthly-summary",
        title:"סיכום חודשי",
        body:"הסיכום של החודש הקודם מוכן לצפייה.",
        sendAt:sendAt.toISOString(),
        deepLink:""
      });
    }else{
      await cancelServerReminder(device,"monthly_summary","monthly-summary").catch(()=>{});
    }

    // WEEKLY SUMMARY
    if(p.weekly?.enabled){
      const sendAt=nextWeeklyOccurrence(p.weekly.day??0,p.weekly.time||"18:00");
      await createServerReminderIfChanged(device,{
        type:"weekly_summary",
        referenceId:"weekly-summary",
        title:"סיכום שבועי",
        body:"הסיכום השבועי שלך מוכן לצפייה.",
        sendAt:sendAt.toISOString(),
        deepLink:""
      });
    }else{
      await cancelServerReminder(device,"weekly_summary","weekly-summary").catch(()=>{});
    }
  }

  async function refreshPushUi(){
    const enableBtn = pushEl("enablePushNotifications");
    const testBtn = pushEl("sendPushTest");
    if(!enableBtn || !testBtn) return;

    if(!(await messagingSupported())){
      setPushStatus("Push אינו נתמך בדפדפן או במכשיר הזה.", "error");
      enableBtn.disabled = true;
      testBtn.disabled = true;
      return;
    }

    if(Notification.permission === "denied"){
      setPushStatus("ההתראות חסומות בדפדפן. יש לאפשר אותן בהגדרות האתר.", "error");
      testBtn.disabled = true;
      return;
    }

    const device = loadPushDevice();
    if(Notification.permission === "granted" && device?.pushToken){
      setPushStatus("ההתראות פעילות במכשיר הזה.", "ok");
      testBtn.disabled = false;
      registerPushNotifications({requestPermission:false}).catch(()=>{});
    }else{
      setPushStatus(Notification.permission === "granted"
        ? "ההרשאה קיימת. לחץ הפעל התראות כדי להשלים את הרישום."
        : "ההתראות עדיין לא הופעלו.");
      testBtn.disabled = true;
    }
  }

  pushEl("enablePushNotifications")?.addEventListener("click", enablePushFromButton);
  pushEl("sendPushTest")?.addEventListener("click", sendPushTest);

  if(await messagingSupported()){
    try{
      if(!pushMessaging) pushMessaging = getMessaging(pushApp);
      onMessage(pushMessaging, async payload => {
        const title = payload?.notification?.title || "Salary App";
        const body = payload?.notification?.body || "התקבלה התראה חדשה";
        try{
          const reg = await navigator.serviceWorker.ready;
          if(Notification.permission === "granted"){
            await reg.showNotification(title, {
              body,
              icon:"./icon-192.png",
              badge:"./icon-192.png",
              data:{url:payload?.data?.url || payload?.data?.deepLink || "./"}
            });
          }
        }catch(e){}
      });
    }catch(e){
      console.warn("Foreground messaging listener failed", e);
    }
  }

  window.addEventListener('salary-notification-settings-changed',()=>syncNotificationSchedules().catch(e=>console.warn("Reminder sync failed",e)));
  window.addEventListener('salary-shift-changed',ev=>{
    const action=ev.detail?.action;
    const shiftId=ev.detail?.shiftId;
    if(!shiftId) return;
    if(action==='delete'){
      const device=loadPushDevice();
      if(device?.deviceId && device?.deviceSecret){
        cancelServerReminder(device,"shift",String(shiftId)).catch(e=>console.warn("Reminder cancel failed",e));
      }
    }else{
      syncOneShiftReminder(String(shiftId)).catch(e=>console.warn("Shift reminder sync failed",e));
    }
  });
  refreshPushUi();
  setTimeout(()=>syncNotificationSchedules().catch(e=>console.warn("Reminder startup sync failed",e)),1500);
