importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAFDEs33DVG3O_RYz_b3yaAgJ1LYmNbbRQ",
  authDomain: "salary-app-507708.firebaseapp.com",
  projectId: "salary-app-507708",
  storageBucket: "salary-app-507708.firebasestorage.app",
  messagingSenderId: "671607022405",
  appId: "1:671607022405:web:05d26d5fbe92f49870542c"
});

// Explicit background Push handling.
// The backend sends data-only FCM messages. This service worker displays them
// even when the Salary App is closed.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || "Salary App";
  const body = data.body || "";
  const targetUrl = data.url || data.deepLink || "";

  self.registration.showNotification(title, {
    body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: targetUrl },
    tag: data.tag || data.reminderId || undefined,
    renotify: false
  });
});

const CACHE_NAME = 'salary-app-v53';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './dd.json',
  './version.json',
  './privacy.html',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallback){
  try{
    const response = await fetch(request, {cache:'no-store'});
    if(response && response.ok){
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(()=>{});
    }
    return response;
  }catch(e){
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : Response.error());
  }
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  if(event.request.mode === 'navigate'){
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  if(url.pathname.endsWith('/version.json') || url.pathname.endsWith('/dd.json') || url.pathname.endsWith('/sw.js')){
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});
      return response;
    }))
  );
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});


self.addEventListener('notificationclick', event => {
  event.notification.close();

  const appBase = "https://firasnajjar59.github.io/salary-app/";
  const raw = String(event.notification?.data?.url || "").trim();

  // No link for this notification: close it and do nothing else.
  if (!raw) {
    return;
  }

  let targetUrl = "";
  try {
    if (raw.startsWith("?")) {
      targetUrl = appBase + raw;
    } else if (raw.startsWith(appBase)) {
      targetUrl = raw;
    } else if (raw.startsWith("./")) {
      targetUrl = new URL(raw, appBase).href;
    }
  } catch (_) {}

  // Invalid / unsupported link: close only.
  if (!targetUrl) {
    return;
  }

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clientList) {
      if ("navigate" in client) {
        try { await client.navigate(targetUrl); } catch (_) {}
      }
      if ("focus" in client) return client.focus();
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});
