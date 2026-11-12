/**
 * Service worker: permite abrir la plataforma sin conexión.
 * - Páginas, CSS, JS e iconos: se sirven desde caché y se actualizan en segundo plano.
 * - API (GET): primero la red; si no hay conexión, la última respuesta guardada.
 * - Mapa: las teselas de OpenStreetMap que ya se vieron se guardan (máx. MAX_TESELAS).
 * Cambia VERSION cada vez que publiques cambios en el frontend.
 */
const VERSION = 'qc-v6';
const CACHE_ESTATICO = `${VERSION}-estatico`;
const CACHE_API = 'qc-api';
const CACHE_MAPA = 'qc-mapa';
const MAX_TESELAS = 600;
const SERVIDOR_TESELAS = 'tile.openstreetmap.org';

const ESTATICOS = [
  '/', '/inicio', '/aula', '/conectividad', '/recursos', '/oportunidades', '/diagnostico', '/certificado', '/perfil',
  '/css/base.css', '/css/perfil.css', '/js/perfil.js', '/css/acceso.css', '/css/inicio.css', '/css/aula.css', '/css/conectividad.css',
  '/css/diagnostico.css', '/css/certificado.css',
  '/js/api.js', '/js/comun.js', '/js/cola.js', '/js/analisis.js', '/js/acceso.js', '/js/inicio.js', '/js/aula.js',
  '/js/conectividad.js', '/js/recursos.js', '/js/oportunidades.js', '/js/diagnostico.js', '/js/certificado.js',
  '/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css',
  '/img/iconos.svg', '/img/logo.svg', '/manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_ESTATICO).then(c => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves
        .filter(k => ![CACHE_ESTATICO, CACHE_API, CACHE_MAPA].includes(k))
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

/** Borra las teselas más antiguas si se pasa del límite. */
async function recortar(cache) {
  const claves = await cache.keys();
  for (const k of claves.slice(0, Math.max(0, claves.length - MAX_TESELAS))) await cache.delete(k);
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Teselas del mapa: primero caché (ahorra datos), si no hay, red y se guarda
  if (url.hostname === SERVIDOR_TESELAS) {
    e.respondWith(caches.open(CACHE_MAPA).then(async cache => {
      const guardada = await cache.match(e.request);
      if (guardada) return guardada;
      try {
        const res = await fetch(e.request);
        if (res.ok) { await cache.put(e.request, res.clone()); recortar(cache); }
        return res;
      } catch {
        return new Response('', { status: 504 });
      }
    }));
    return;
  }

  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/api/facilitador') ||
      url.pathname.endsWith('/exportar') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/facilitador')) return; // siempre en red

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE_API).then(c => c.put(e.request, copia)); }
          return res;
        })
        .catch(async () => (await caches.match(e.request)) || new Response(
          JSON.stringify({ error: 'Sin conexión y sin datos guardados para esta sección.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(enCache => {
      const red = fetch(e.request)
        .then(res => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE_ESTATICO).then(c => c.put(e.request, copia)); }
          return res;
        })
        .catch(() => enCache);
      return enCache || red;
    }));
});
