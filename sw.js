var CACHE = 'tmr-v4';
var ASSETS = ['./', './index.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS).catch(function(){}) }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE }).map(function(k) { return caches.delete(k) }));
  }));
  self.clients.claim();
});

// Network-first z 3-sekundowym timeoutem dla HTML, cache-first dla reszty
self.addEventListener('fetch', function(e) {
  var req = e.request;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  
  if (isHTML) {
    // HTML: network-first z timeoutem, fallback do cache jesli wolne
    e.respondWith(
      Promise.race([
        fetch(req).then(function(r) {
          if (r && r.status === 200) {
            var c = r.clone();
            caches.open(CACHE).then(function(cache) { cache.put(req, c) });
          }
          return r;
        }),
        new Promise(function(resolve) {
          setTimeout(function() {
            caches.match(req).then(function(cached) {
              if (cached) resolve(cached);
            });
          }, 3000);
        })
      ]).catch(function() {
        return caches.match(req) || caches.match('./index.html');
      })
    );
  } else {
    // Reszta: cache-first
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(r) {
          if (r && r.status === 200) {
            var c = r.clone();
            caches.open(CACHE).then(function(cache) { cache.put(req, c) });
          }
          return r;
        });
      })
    );
  }
});
