// Service worker mínimo: guarda la app para abrirla sin conexión. Los datos siempre se piden a la red.
const CACHE = "viwai-v22";
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "icons/icono.svg", "config.js", "js/nube.js", "js/bienvenida.js", "js/bienvenida.css", "js/ayudas.js", "js/cuenta.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
