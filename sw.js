/* İnternetsiz açılış için hizmet çalışanı (service worker).
 *
 * - Sayfanın kendisi (index.html) ve damgasız dosyalar: önce ağ, ağ yoksa son kopya. Böylece yayına giren
 *   yeni sürüm hemen görünür; eski kopya yalnızca internet yokken kullanılır.
 * - Damgalı dosyalar (js/app.js?v=…, css/style.css?v=…): önce önbellek. Dosya değişince damgası da değişir,
 *   yeni adres ağdan alınır; aynı dosyanın eski damgalı kopyası önbellekten silinir.
 * - Yazı tipleri (Google Fonts): önce önbellek.
 * - Firebase gibi öbür adreslere dokunulmaz.
 *
 * Kurulurken index.html okunur ve içindeki damgalı dosyalar önceden indirilir; ilk ziyaretten sonra uygulama
 * internetsiz de açılır.
 */
'use strict';

const CACHE = 'bilsem-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SCOPE = new URL(self.registration.scope);

/* Aynı dosyanın (damgası farklı) eski kopyalarını siler. */
async function dropOldStamps(cache, url) {
  const keys = await cache.keys();
  await Promise.all(keys.map((req) => {
    const u = new URL(req.url);
    return u.pathname === url.pathname && u.search !== url.search ? cache.delete(req) : null;
  }));
}

async function put(cache, req, res) {
  const url = new URL(req.url);
  if (url.searchParams.has('v')) await dropOldStamps(cache, url);
  await cache.put(req, res);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const indexUrl = new URL('./', SCOPE).href;
      const res = await fetch(indexUrl, { cache: 'no-cache' });
      if (!res.ok) return;
      const html = await res.clone().text();
      await cache.put(indexUrl, res);
      const files = Array.from(html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)).map((m) => new URL(m[1], SCOPE).href);
      files.push(new URL('js/vendor/firebase.js', SCOPE).href);
      await Promise.all(files.map(async (f) => {
        try { const r = await fetch(f); if (r.ok) await put(cache, new Request(f), r); } catch (err) { /* sonra yeniden denenir */ }
      }));
    } catch (err) { /* ağ yoksa kurulum yine biter; dosyalar kullanıldıkça önbelleğe girer */ }
  })().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('bilsem-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') await put(cache, req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) await put(cache, req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const index = await cache.match(new URL('./', SCOPE).href);
      if (index) return index;
    }
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req)); return; }
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (url.pathname.endsWith('/sw.js')) return;
  e.respondWith(url.searchParams.has('v') ? cacheFirst(req) : networkFirst(req));
});
