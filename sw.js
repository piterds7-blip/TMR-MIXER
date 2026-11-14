// TMR Mixer — service worker: aplikacja działa offline.
// Wszystkie pliki są w repozytorium; nic nie jest pobierane z zewnętrznych serwerów.
var CACHE = 'tmr-v9';
var ASSETS = [
  './', './index.html', './privacy.html', './manifest.json', './icon-192.png', './icon-512.png',
  './vendor/icons.css', './vendor/jspdf.umd.min.js', './vendor/qrcode.min.js', './vendor/xlsx.full.min.js'
];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) {
    return Promise.all(ASSETS.map(function(u) { return c.add(u).catch(function() {}); }));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isHTML) {
    // Strona: najpierw sieć (świeża wersja), po 3 s lub bez sieci — kopia z pamięci
    e.respondWith(new Promise(function(resolve) {
      var done = false;
      function finish(r) { if (!done && r) { done = true; resolve(r); } }
      var timer = setTimeout(function() {
        caches.match(req, { ignoreSearch: true }).then(finish);
      }, 3000);
      fetch(req).then(function(r) {
        clearTimeout(timer);
        if (r && r.status === 200) { var c = r.clone(); caches.open(CACHE).then(function(cache) { cache.put(req.url.split('?')[0], c); }); }
        finish(r);
      }).catch(function() {
        clearTimeout(timer);
        caches.match(req, { ignoreSearch: true }).then(function(c) { return c || caches.match('./index.html'); }).then(finish);
      });
    }));
  } else {
    // Pozostałe pliki: najpierw pamięć, potem sieć
    e.respondWith(caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(r) {
        if (r && r.status === 200) { var c = r.clone(); caches.open(CACHE).then(function(cache) { cache.put(req, c); }); }
        return r;
      });
    }));
  }
});
