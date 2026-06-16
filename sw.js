var CACHE = 'tmr-v6';
var ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
var EXTERNAL = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css'
];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) {
    return c.addAll(ASSETS).catch(function(){}).then(function(){
      // cache external libs (best effort, no-cors)
      return Promise.all(EXTERNAL.map(function(u){
        return fetch(u,{mode:'no-cors'}).then(function(r){return c.put(u,r)}).catch(function(){});
      }));
    });
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE }).map(function(k) { return caches.delete(k) }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isHTML) {
    e.respondWith(
      Promise.race([
        fetch(req).then(function(r) {
          if (r && r.status === 200) { var c = r.clone(); caches.open(CACHE).then(function(cache){cache.put(req,c)}) }
          return r;
        }),
        new Promise(function(resolve){ setTimeout(function(){ caches.match(req).then(function(c){ if(c) resolve(c) }) }, 3000) })
      ]).catch(function(){ return caches.match(req).then(function(c){ return c || caches.match('./index.html') }) })
    );
  } else {
    e.respondWith(
      caches.match(req).then(function(cached){
        if (cached) return cached;
        return fetch(req).then(function(r){
          if (r && r.status === 200) { var c = r.clone(); caches.open(CACHE).then(function(cache){cache.put(req,c)}) }
          return r;
        }).catch(function(){ return cached });
      })
    );
  }
});
