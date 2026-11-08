// Viwai · Awin: tiendas en las que estamos aceptadas y sus catálogos de productos para España.
// Necesita AWIN_TOKEN (token de la API de Awin) y AWIN_PUBLISHER_ID (id de la cuenta, 3148698).
// Para los productos, además AWIN_FEED_LIST: el enlace «Descargar lista» de Herramientas → Crea-un-feed
// (lleva nuestra clave; por eso va en los secretos). Sin él solo se dan de alta las tiendas.
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";

const API = "https://api.awin.com";
const FEEDS = "https://productdata.awin.com";
const COLUMNAS = ["aw_product_id", "product_name", "aw_deep_link", "merchant_image_url", "aw_image_url", "merchant_category",
  "category_name", "search_price", "rrp_price", "currency", "brand_name", "in_stock"];

export const enlaceTienda = (programaId, publisher = process.env.AWIN_PUBLISHER_ID) =>
  `https://www.awin1.com/cread.php?awinmid=${programaId}&awinaffid=${publisher}`;

export async function programas() {
  const pub = process.env.AWIN_PUBLISHER_ID;
  const r = await fetch(`${API}/publishers/${pub}/programmes?relationship=joined&accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`);
  if (!r.ok) throw new Error(`Awin tiendas: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const lista = (await r.json()).map(aPrograma);
  // Catálogos de producto (si hay clave de Create-a-Feed)
  if (process.env.AWIN_FEED_LIST) {
    try {
      const feeds = await listaFeeds();
      for (const p of lista) p.feeds = feeds.get(p.programa_id) || [];
    } catch (e) { console.log("   Awin: sin catálogos (" + e.message + ")"); }
  }
  return lista;
}

export function aPrograma(p) {
  return {
    red: "awin",
    programa_id: String(p.id),
    nombre: p.name,
    web_url: p.displayUrl || null,
    enlace: enlaceTienda(p.id),
    cashback: null, // Awin no lo dice por API: se comprueba en las condiciones de cada tienda
    pais: p.primaryRegion?.countryCode || null,
    feeds: [],
  };
}

// Lista de catálogos: CSV con una fila por catálogo. Nos quedamos con los de tiendas aceptadas, en español.
async function listaFeeds() {
  const r = await fetch(process.env.AWIN_FEED_LIST);
  if (!r.ok) throw new Error(`Awin catálogos: ${r.status}`);
  return feedsPorTienda(await textoPosiblementeGzip(r));
}

export function feedsPorTienda(csv) {
  const filas = leeCSV(csv);
  const cab = filas.shift()?.map((c) => c.trim().toLowerCase()) || [];
  const col = (n) => cab.indexOf(n);
  const busca = (...n) => cab.findIndex((c) => n.some((x) => c === x || c.replace(/[^a-z]/g, "") === x.replace(/[^a-z]/g, "")));
  const [iAdv, iFeed, iLang, iMem, iUrl] = [busca("advertiser id", "advertiserid"), busca("feed id", "feedid"), busca("language"),
    busca("membership status", "membershipstatus"), busca("url", "download url")];
  const m = new Map();
  for (const f of filas) {
    if (!f[iAdv] || !f[iFeed]) continue;
    if (iMem >= 0 && !/^\s*(active|joined)\s*$/i.test(f[iMem] || "")) continue;
    if (iLang >= 0 && f[iLang] && !/^es/i.test(f[iLang])) continue;
    const id = String(f[iAdv]).trim();
    if (!m.has(id)) m.set(id, []);
    m.get(id).push(iUrl >= 0 && f[iUrl] ? f[iUrl].trim() : String(f[iFeed]).trim());
  }
  return m;
}

export const urlFeed = (fid, clave = process.env.AWIN_FEED_KEY) =>
  `${FEEDS}/datafeed/download/apikey/${clave}/language/es/fid/${fid}/columns/${COLUMNAS.join(",")}/format/csv/delimiter/%2C/compression/gzip/`;

export async function* productos(prog, max) {
  let n = 0;
  for (const feed of prog.feeds || []) {
    if (n >= max) return;
    const r = await fetch(/^https?:/.test(feed) ? feed : urlFeed(feed), { signal: AbortSignal.timeout(6 * 60e3) });
    if (!r.ok || !r.body) throw new Error(`Awin catálogo ${prog.nombre}: ${r.status}`);
    const texto = await flujoTexto(r);
    let cab = null;
    for await (const fila of filasCSV(texto)) {
      if (!cab) { cab = fila.map((c) => c.trim()); continue; }
      const o = aProducto(Object.fromEntries(cab.map((c, i) => [c, fila[i]])));
      if (o) { n++; yield o; if (n >= max) return; }
    }
  }
}

export function aProducto(p) {
  const precio = Number(String(p.search_price ?? "").replace(",", "."));
  const antes = Number(String(p.rrp_price ?? "").replace(",", "."));
  if (!p.aw_product_id || !p.product_name || !p.aw_deep_link || !Number.isFinite(precio) || precio <= 0) return null;
  if (p.currency && p.currency !== "EUR") return null;
  return {
    ref: String(p.aw_product_id), titulo: p.product_name, marca: p.brand_name || null,
    precio: Math.round(precio * 100) / 100,
    precio_tachado: Number.isFinite(antes) && antes > precio ? Math.round(antes * 100) / 100 : null,
    moneda: "EUR", imagen: p.merchant_image_url || p.aw_image_url || null, url: p.aw_deep_link,
    categoria_tienda: p.merchant_category || p.category_name || null,
    disponible: p.in_stock == null || p.in_stock === "" || /^(1|yes|true|si|sí)$/i.test(String(p.in_stock)),
  };
}

// Los catálogos pueden venir comprimidos (gzip) o no: se mira la firma del principio.
async function flujoTexto(r) {
  const it = r.body[Symbol.asyncIterator]();
  const primero = await it.next();
  const cabeza = primero.value || new Uint8Array();
  async function* todo() { if (!primero.done) yield cabeza; for (;;) { const x = await it.next(); if (x.done) return; yield x.value; } }
  const flujo = Readable.from(todo());
  return (cabeza[0] === 0x1f && cabeza[1] === 0x8b ? flujo.pipe(createGunzip()) : flujo).setEncoding("utf8");
}
async function textoPosiblementeGzip(r) {
  let t = ""; for await (const x of await flujoTexto(r)) t += x; return t;
}

// CSV con comillas (los títulos llevan comas). leeCSV para texto entero; filasCSV para un flujo.
export function leeCSV(texto) {
  const filas = [];
  let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n") { fila.push(campo.replace(/\r$/, "")); filas.push(fila); fila = []; campo = ""; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.length > 1 || f[0]);
}

export async function* filasCSV(trozos) {
  let fila = [], campo = "", comillas = false, previa = "";
  for await (const t of trozos) {
    const texto = previa + t; previa = "";
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (comillas) {
        if (c === '"') {
          if (i + 1 === texto.length) { previa = '"'; break; } // no sabemos aún si es "" o cierre
          if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
        } else campo += c;
      } else if (c === '"') comillas = true;
      else if (c === ",") { fila.push(campo); campo = ""; }
      else if (c === "\n") { fila.push(campo.replace(/\r$/, "")); yield fila; fila = []; campo = ""; }
      else campo += c;
    }
  }
  if (campo || fila.length) { fila.push(campo); yield fila; }
}
