// Service Worker de Gastos — permite abrir y editar la app sin conexión.
// Estrategia: caché primero, red en segundo plano (stale-while-revalidate).
// Compras_v46.html es grande (500KB+) y va creciendo — con "red primero"
// (como se hizo al inicio) cada apertura esperaba la descarga COMPLETA del
// archivo antes de mostrar nada, y en una conexión lenta/inestable eso se
// sentía como "tarda mucho en cargar" aunque ya hubiera una copia guardada
// en el dispositivo. Ahora: si hay una copia en caché, se sirve de
// inmediato (la app abre al instante) y, al mismo tiempo, se pide la
// versión fresca en segundo plano para la PRÓXIMA vez que se abra.
const CACHE_NAME = 'gastos-shell-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo nos metemos con pedidos GET al propio dominio — todo lo demás (Apps
  // Script, CDNs, fuentes) pasa directo a la red sin tocar caché, así no
  // interferimos con el manejo de "sin conexión" que hace la app para guardar datos.
  const esMismoOrigen = new URL(req.url).origin === self.location.origin;
  if (req.method !== 'GET' || !esMismoOrigen) return;

  event.respondWith(
    caches.match(req).then((cacheado) => {
      const enRed = fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return res;
        })
        .catch(() => cacheado || caches.match('Compras_v46.html'));
      // Si ya hay copia guardada, se sirve YA (no se espera a la red);
      // la red actualiza la caché sola para la próxima apertura.
      return cacheado || enRed;
    })
  );
});
