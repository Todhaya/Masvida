// Service worker mínimo: guarda la app para abrirla sin conexión. Los datos siempre se piden a la red.
// También recibe lo que se comparte con Viwai desde otras apps (enlaces de seguimiento, PDF o capturas de entradas).
importScripts("js/archivos.js");
const CACHE = "viwai-v35";
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "icons/icono.svg", "config.js", "js/nube.js", "js/bienvenida.js", "js/bienvenida.css", "js/ayudas.js", "js/cuenta.js", "js/clic.js", "js/seguimiento.js", "js/archivos.js", "js/ayuda.js", "js/codigos.js", "vendor/qrcode.js", "diseno/tokens.css", "diseno/componentes.css", "diseno/iconos.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (e.request.method === "POST" && u.searchParams.has("compartir")) { e.respondWith(recibe(e.request)); return; }
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
async function recibe(req) {
  const f = await req.formData(), q = new URLSearchParams({ compartir: "1" });
  for (const k of ["titulo", "texto", "enlace"]) if (f.get(k)) q.set(k, f.get(k));
  const a = f.getAll("archivo").find((x) => x && x.size);
  if (a) { await self.viwaiArchivos.guarda("compartido", a); q.set("archivo", a.type === "application/pdf" ? "pdf" : "img"); q.set("nombre", a.name || ""); }
  return Response.redirect("./?" + q, 303);
}
