// NeoPed CDSS – service worker: chạy offline tại giường bệnh (PWA).
// Tăng CACHE mỗi khi phát hành phiên bản mới để trình duyệt tải lại toàn bộ tệp.
const CACHE = 'neoped-v2.3.0';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'fonts/be-vietnam-pro-300-latin-ext.woff2',
  'fonts/be-vietnam-pro-300-latin.woff2',
  'fonts/be-vietnam-pro-300-vietnamese.woff2',
  'fonts/be-vietnam-pro-400-latin-ext.woff2',
  'fonts/be-vietnam-pro-400-latin.woff2',
  'fonts/be-vietnam-pro-400-vietnamese.woff2',
  'fonts/be-vietnam-pro-500-latin-ext.woff2',
  'fonts/be-vietnam-pro-500-latin.woff2',
  'fonts/be-vietnam-pro-500-vietnamese.woff2',
  'fonts/be-vietnam-pro-600-latin-ext.woff2',
  'fonts/be-vietnam-pro-600-latin.woff2',
  'fonts/be-vietnam-pro-600-vietnamese.woff2',
  'fonts/be-vietnam-pro-700-latin-ext.woff2',
  'fonts/be-vietnam-pro-700-latin.woff2',
  'fonts/be-vietnam-pro-700-vietnamese.woff2',
  'fonts/be-vietnam-pro-800-latin-ext.woff2',
  'fonts/be-vietnam-pro-800-latin.woff2',
  'fonts/be-vietnam-pro-800-vietnamese.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Trang chính: ưu tiên mạng để nhận bản cập nhật liều mới nhất; mất mạng thì dùng bản đã lưu
  // Chỉ xử lý trang gốc của app; trang con (ví dụ prompt/) không được ghi đè bản index.html đã lưu
  if (req.mode === 'navigate') {
    const scope = new URL(self.registration.scope).pathname;
    const p = new URL(req.url).pathname;
    if (p !== scope && p !== scope + 'index.html') return;
    e.respondWith(fetch(req)
      .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); } return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // Font, icon, manifest: ưu tiên bản đã lưu
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
