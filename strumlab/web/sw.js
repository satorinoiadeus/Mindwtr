const APP_CACHE='strumlab-app-v2.0.0';
const AUDIO_CACHE='strumlab-audio-v1';
const APP_ASSETS=['./','index.html','styles.css','app.js','icon.svg','manifest.webmanifest','version.json'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(APP_CACHE).then(cache=>cache.addAll(APP_ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('strumlab-app-')&&k!==APP_CACHE).map(k=>caches.delete(k))))
  ]));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.hostname==='raw.githubusercontent.com' && url.pathname.includes('/Meta-open-sound/') && url.pathname.endsWith('.ogg')){
    event.respondWith(caches.open(AUDIO_CACHE).then(async cache=>{
      const hit=await cache.match(event.request); if(hit) return hit;
      const response=await fetch(event.request); if(response.ok) cache.put(event.request,response.clone()); return response;
    }));
    return;
  }
  if(event.request.method!=='GET') return;
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    if(url.origin===self.location.origin && response.ok){const copy=response.clone();caches.open(APP_CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })));
});
