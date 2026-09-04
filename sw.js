const CACHE_NAME = 'salary-app-v29';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './dd.json',
  './version.json',
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
