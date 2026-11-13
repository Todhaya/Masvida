// Viwai · lector de la web de tiendas que no dan catálogo a afiliados (decisión de Alba, 13 nov 2026).
// Lee pocas páginas de categoría, una vez por noche, y pone a cada producto nuestro enlace de afiliación.
// Solo para tiendas aprobadas en su red. Si la tienda cambia su web, el lector deja de encontrar productos
// (la carga lo dice en el registro: «0 productos») y no rompe nada más.

const UA = "Mozilla/5.0 (compatible; ViwaiBot/1.0; +https://www.viwai.es/sobre/)";

// Eurekakids: cada ficha del listado lleva un formulario con data-product='{json}', el enlace y la foto.
export function leeEurekakids(html, base = "https://www.eurekakids.es") {
  const out = [];
  for (const b of html.split('<div class="product-list product-list-02').slice(1)) {
    const m = b.match(/data-product='([^']+)'/);
    if (!m) continue;
    let p;
    try { p = JSON.parse(m[1]); } catch { continue; }
    const d = p.definition || {};
    const precio = Number(d.retailPrice ?? d.price);
    const antes = Number(d.price);
    const href = (b.match(/<a [^>]*href="([^"]+)"/) || [])[1];
    const src = (b.match(/<img [^>]*src="([^"]+)"/) || [])[1];
    if (!p.id || !p.name || !href || !src || !Number.isFinite(precio) || precio <= 0) continue;
    out.push({
      ref: String(p.id), titulo: p.name, marca: p.brandName || null,
      precio: Math.round(precio * 100) / 100,
      precio_tachado: Number.isFinite(antes) && antes > precio ? Math.round(antes * 100) / 100 : null,
      moneda: "EUR", imagen: new URL(src, base).href.split("?")[0], destino: new URL(href, base).href.split("?")[0],
      categoria_tienda: null, disponible: p.availabilityId == null || Number(p.availabilityId) === 0,
    });
  }
  return out;
}

export const LECTORES = {
  eurekakids: {
    base: "https://www.eurekakids.es",
    paginas: ["/juguetes-educativos", "/juguetes-para-bebes", "/preescolar-12-24m", "/juego-simbolico", "/actividades-creativas",
      "/juguetes-de-exterior", "/juguetes-sobre-ruedas", "/libros-infantiles", "/organizacion-mobiliario-y-decoracion", "/outlet"],
    lee: leeEurekakids,
  },
};

const clave = (nombre) => String(nombre || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
export const lectorDe = (prog) => LECTORES[clave(prog?.nombre)] || null;

// enlace(destino) → enlace de afiliación de la red
export async function* productosWeb(prog, max, enlace) {
  const L = lectorDe(prog);
  if (!L) return;
  const vistos = new Set();
  let n = 0;
  for (const ruta of L.paginas) {
    let html;
    try {
      const r = await fetch(L.base + ruta, { headers: { "User-Agent": UA, "Accept-Language": "es-ES" }, signal: AbortSignal.timeout(60e3) });
      if (!r.ok) { console.log(`   ${prog.nombre}: ${ruta} → ${r.status}`); continue; }
      html = await r.text();
    } catch (e) { console.log(`   ${prog.nombre}: ${ruta} → ${e.message}`); continue; }
    for (const o of L.lee(html, L.base)) {
      if (vistos.has(o.ref)) continue;
      vistos.add(o.ref);
      const { destino, ...resto } = o;
      yield { ...resto, url: enlace(destino) };
      if (++n >= max) return;
    }
    await new Promise((r) => setTimeout(r, 1500)); // sin prisas: una página cada 1,5 s
  }
}
