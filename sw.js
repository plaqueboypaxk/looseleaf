/* looseleaf service worker: keeps the app itself available offline.
   Your songs never pass through here; they live in the vault. */
const V = 'looseleaf-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('looseleaf-') && k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {                       // page loads: newest copy when online, saved copy offline
    e.respondWith(
      fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put('index.html', c)); } return r; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  if (url.origin === location.origin || /(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
