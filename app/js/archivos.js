// Viwai · archivos guardados solo en este móvil (entradas, billetes…). Los usa la app y el service worker.
// No se suben a ningún sitio: viven en el almacenamiento del navegador del móvil (IndexedDB).
(function (g) {
  const abre = () => new Promise((ok, ko) => {
    const r = indexedDB.open("viwai-archivos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("a");
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
  const op = (modo, f) => abre().then((db) => new Promise((ok, ko) => {
    const t = db.transaction("a", modo), s = t.objectStore("a"), q = f(s);
    t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error);
  }));
  // Si el navegador no deja guardar (modo privado, vista previa…), se guarda en memoria mientras la app esté abierta
  const mem = new Map(), oMem = (f, m) => (...a) => f(...a).catch(() => m(...a));
  g.viwaiArchivos = {
    guarda: oMem((id, blob) => op("readwrite", (s) => s.put(blob, id)), (id, blob) => { mem.set(id, blob); }),
    lee: oMem((id) => op("readonly", (s) => s.get(id)).then((x) => x ?? mem.get(id)), (id) => mem.get(id)),
    borra: oMem((id) => op("readwrite", (s) => s.delete(id)).then(() => { mem.delete(id); }), (id) => { mem.delete(id); }),
  };
})(self);
