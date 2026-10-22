/* =====================================================================
   Service Worker — Torneo de Ajedrez · Zona Escolar 05
   Colegio Jerome Bruner

   Qué hace: guarda la "cáscara" de la aplicación (la pantalla, el menú,
   el ícono) para que abra al instante y muestre un aviso decente cuando
   no hay internet.

   Qué NO hace: NO guarda las partidas ni la tabla de posiciones. Eso
   siempre se pide en vivo al servidor del torneo, para que nadie vea
   resultados viejos.

   IMPORTANTE: cada vez que cambies index.html, sube el número de
   VERSION de abajo (v1 → v2 → v3...). Si no lo subes, los celulares
   que ya la tienen instalada seguirán mostrando la versión anterior.
   ===================================================================== */

const VERSION = 'ajedrez-jb-v2';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

/* -------------------- instalación -------------------- */
self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(VERSION)
      .then(function (cache) {
        /* addAll falla entero si un archivo falta; se agregan uno por uno */
        return Promise.all(
          ARCHIVOS.map(function (archivo) {
            return cache.add(archivo).catch(function () { return null; });
          })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

/* -------------------- limpieza de versiones viejas -------------------- */
self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys()
      .then(function (nombres) {
        return Promise.all(
          nombres.map(function (nombre) {
            if (nombre !== VERSION) return caches.delete(nombre);
            return null;
          })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* -------------------- peticiones -------------------- */
self.addEventListener('fetch', function (evento) {
  const peticion = evento.request;

  /* solo se atiende lo propio de la app; lo de Google (el torneo) pasa de largo */
  if (peticion.method !== 'GET') return;
  if (new URL(peticion.url).origin !== self.location.origin) return;

  /* Primero la red, luego el guardado.
     Así, en cuanto hay señal, el papá ve siempre la versión más nueva. */
  evento.respondWith(
    fetch(peticion)
      .then(function (respuesta) {
        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
          const copia = respuesta.clone();
          caches.open(VERSION).then(function (cache) {
            cache.put(peticion, copia).catch(function () {});
          });
        }
        return respuesta;
      })
      .catch(function () {
        return caches.match(peticion).then(function (guardada) {
          if (guardada) return guardada;
          /* navegación sin señal y sin copia: se devuelve la portada */
          if (peticion.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Sin conexión' });
        });
      })
  );
});
