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

// Firebase Messaging attaches background Push handling to the existing PWA service worker.
firebase.messaging();

const CACHE_NAME = 'salary-app-v50';
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
  const targetUrl = event.notification?.data?.url || './';
  event.waitUntil((async()=>{
    const absoluteUrl = new URL(targetUrl, self.location.origin + self.location.pathname).href;
    const clientList = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for(const client of clientList){
      if('focus' in client){
        if('navigate' in client) await client.navigate(absoluteUrl);
        return client.focus();
      }
    }
    if(self.clients.openWindow) return self.clients.openWindow(absoluteUrl);
  })());
});
