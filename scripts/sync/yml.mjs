// Viwai · lectura de catálogos en formato YML (el XML de producto que dan Admitad y otras redes).
// Se lee en trozos, sin cargar el archivo entero en memoria, y se para al llegar al tope de productos.

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const desescapa = (s) => String(s ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m))
  .trim();

const etiqueta = (bloque, nombre) => {
  const m = bloque.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, "i"));
  return m ? desescapa(m[1]) : null;
};
const atributo = (cabecera, nombre) => {
  const m = cabecera.match(new RegExp(`\\s${nombre}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? desescapa(m[1]) : null;
};
const num = (x) => {
  if (x == null || x === "") return null;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

export function leeCategorias(texto) {
  const cats = {};
  for (const m of texto.matchAll(/<category\s([^>]*)>([\s\S]*?)<\/category>/gi)) {
    const id = atributo(" " + m[1], "id");
    if (id) cats[id] = { nombre: desescapa(m[2]), padre: atributo(" " + m[1], "parentId") };
  }
  return cats;
}

export function rutaCategoria(cats, id) {
  const partes = [];
  for (let i = 0, c = cats[id]; c && i < 6; i++, c = cats[c.padre]) partes.unshift(c.nombre);
  return partes.join(" > ");
}

export function leeOferta(bloque, cats = {}) {
  const cab = bloque.slice(0, bloque.indexOf(">") + 1);
  const disponible = atributo(cab, "available");
  const catId = etiqueta(bloque, "categoryId");
  const nombre = etiqueta(bloque, "name") || [etiqueta(bloque, "typePrefix"), etiqueta(bloque, "vendor"), etiqueta(bloque, "model")].filter(Boolean).join(" ");
  return {
    ref: atributo(cab, "id"),
    titulo: nombre,
    marca: etiqueta(bloque, "vendor"),
    precio: num(etiqueta(bloque, "price")),
    precio_tachado: num(etiqueta(bloque, "oldprice")),
    moneda: etiqueta(bloque, "currencyId") || "EUR",
    imagen: etiqueta(bloque, "picture"),
    url: etiqueta(bloque, "url"),
    categoria_tienda: catId ? rutaCategoria(cats, catId) || null : etiqueta(bloque, "category"),
    disponible: disponible == null ? true : disponible !== "false",
  };
}

// Recorre un flujo de texto (async iterable de strings) y entrega ofertas válidas hasta `max`.
// Si tras `muestra` ofertas ninguna vale (p. ej. todas en dólares), para y explica por qué.
export async function* ofertasDeFlujo(trozos, max = Infinity, muestra = 2000) {
  let buf = "", cats = {}, catsLeidas = false, n = 0, leidas = 0;
  const monedas = {};
  let ejemplo = "";
  for await (const t of trozos) {
    buf += t;
    if (!catsLeidas) {
      const fin = buf.search(/<\/categories>/i);
      if (fin >= 0) { cats = leeCategorias(buf.slice(0, fin)); catsLeidas = true; }
      else if (/<offer[\s>]/i.test(buf)) catsLeidas = true; // catálogo sin categorías
      else continue;
    }
    let i;
    while ((i = buf.search(/<\/offer>/i)) >= 0) {
      const ini = buf.search(/<offer[\s>]/i);
      const bloque = ini >= 0 && ini < i ? buf.slice(ini, i + 8) : null;
      buf = buf.slice(i + 8);
      if (!bloque) continue;
      const o = leeOferta(bloque, cats);
      leidas++;
      if (!ejemplo) ejemplo = o.titulo || "";
      monedas[o.moneda] = (monedas[o.moneda] || 0) + 1;
      if (!n && leidas >= muestra) {
        throw new Error(`ninguna oferta válida en EUR entre las ${leidas} primeras (monedas: ${Object.entries(monedas).map(([m, c]) => m + "×" + c).join(", ")}; p. ej. «${ejemplo.slice(0, 60)}»)`);
      }
      if (o.ref && o.titulo && o.url && o.precio != null && o.moneda === "EUR") {
        yield o;
        if (++n >= max) return;
      }
    }
    if (buf.length > 5e6) buf = buf.slice(-1e6); // un bloque roto no debe llenar la memoria
  }
}

export async function* textoDeRespuesta(resp) {
  const dec = new TextDecoder();
  for await (const chunk of resp.body) yield dec.decode(chunk, { stream: true });
}
