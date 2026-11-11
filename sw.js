/* Cromoteca — service worker: la app funciona sin conexión y sirve tus fotos guardadas en el móvil */
const VER = 'cromoteca-v1.0.5';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'store.js', 'app.webmanifest', 'icono.svg', 'icon-192.png', 'icon-512.png', 'fondo.jpg',
  'vendor/tesseract.min.js', 'vendor/worker.min.js', 'vendor/tesseract-core-simd-lstm.wasm.js', 'vendor/lang/eng.traineddata.gz'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VER).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});

function leerFoto(k) {
  return new Promise((ok, mal) => {
    const r = indexedDB.open('cromoteca');
    r.onupgradeneeded = () => r.transaction.abort(); // si la base aún no existe, no la crees vacía
    r.onerror = () => mal(r.error);
    r.onsuccess = () => {
      const d = r.result;
      try { const q = d.transaction('fotos').objectStore('fotos').get(k); q.onsuccess = () => { d.close(); ok(q.result ? q.result.blob : null); }; q.onerror = () => { d.close(); mal(q.error); }; }
      catch (err) { d.close(); mal(err); }
    };
  });
}
async function foto(k) {
  try { const b = await leerFoto(k); if (b) return new Response(b, { headers: { 'Content-Type': b.type || 'image/jpeg', 'Cache-Control': 'no-store' } }); } catch (e) {}
  return new Response('No encontrada', { status: 404 });
}
async function rapido(req) {
  const c = await caches.open(VER), hit = await c.match(req, { ignoreSearch: true });
  const red = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  if (hit) return hit;
  const r = await red; if (r) return r;
  if (req.mode === 'navigate') return (await c.match('index.html')) || (await c.match('./'));
  return new Response('Sin conexión', { status: 503 });
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const rel = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (rel.startsWith('fotos/')) return e.respondWith(foto(decodeURIComponent(rel.slice(6))));
  if (rel.startsWith('data/')) return;
  e.respondWith(rapido(req));
});
