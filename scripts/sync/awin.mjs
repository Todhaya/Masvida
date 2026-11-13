// Viwai · Awin: tiendas en las que estamos aceptadas y sus catálogos de productos para España.
// Necesita AWIN_TOKEN (token de la API de Awin) y AWIN_PUBLISHER_ID (id de la cuenta, 3148698).
// Para los productos, además AWIN_FEED_LIST: el enlace «Descargar lista» de Herramientas → Crea-un-feed
// (lleva nuestra clave; por eso va en los secretos). Sin él solo se dan de alta las tiendas.
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { lectorDe, productosWeb } from "./webs.mjs";
import { maxPct } from "./comision.mjs";

const API = "https://api.awin.com";
const FEEDS = "https://productdata.awin.com";
const COLUMNAS = ["aw_product_id", "product_name", "aw_deep_link", "merchant_image_url", "aw_image_url", "merchant_category",
  "category_name", "search_price", "rrp_price", "currency", "brand_name", "in_stock",
  "large_image", "alternate_image", "merchant_thumb_url", "aw_thumb_url"];

export const enlaceTienda = (programaId, publisher = process.env.AWIN_PUBLISHER_ID) =>
  `https://www.awin1.com/cread.php?awinmid=${programaId}&awinaffid=${publisher}`;

export async function programas() {
  const pub = process.env.AWIN_PUBLISHER_ID;
  const r = await fetch(`${API}/publishers/${pub}/programmes?relationship=joined&accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`);
  if (!r.ok) throw new Error(`Awin tiendas: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const lista = (await r.json()).map(aPrograma);
  // Comisión de cada tienda (porcentaje más alto que publica)
  for (const p of lista) {
    try {
      const d = await fetch(`${API}/publishers/${pub}/programmedetails?advertiserId=${p.programa_id}&relationship=joined&accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`);
      if (d.ok) p.comision_pct = pctAwin(await d.json());
    } catch (e) { /* sin comisión: no pasa nada */ }
  }
  // Catálogos de producto (si hay clave de Create-a-Feed)
  if (process.env.AWIN_FEED_LIST) {
    try {
      const feeds = await listaFeeds();
      for (const p of lista) p.feeds = feeds.get(p.programa_id) || [];
      if (process.env.LISTA_REDES) {
        const csv = await textoPosiblementeGzip(await fetch(process.env.AWIN_FEED_LIST));
        const filas = leeCSV(csv), cab = filas.shift() || [];
        console.log("AWIN_FEEDS cabecera: " + cab.join(" | "));
        const ids = new Set(lista.map((p) => p.programa_id));
        console.log("AWIN_FEEDS total filas: " + filas.length);
        for (const f of filas) if (ids.has(String(f[cab.findIndex((c) => /advertiser ?id/i.test(c))]).trim())) console.log("AWIN_FEEDS " + f.slice(0, 12).join(" | "));
      }
    } catch (e) { console.log("   Awin: sin catálogos (" + e.message + ")"); }
  }
  return lista;
}

export const pctAwin = (det) => maxPct((det?.commissionRange || []).filter((c) => !c.type || /percent/i.test(c.type)).map((c) => `${c.max ?? c.min}%`));

export function aPrograma(p) {
  return {
    red: "awin",
    programa_id: String(p.id),
    nombre: p.name,
    web_url: p.displayUrl || null,
    enlace: enlaceTienda(p.id),
    logo_url: p.logoUrl || null,
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
  const iFmt = busca("datafeed format", "format");
  const m = new Map();
  for (const f of filas) {
    if (!f[iAdv] || !f[iFeed]) continue;
    if (iMem >= 0 && !/^\s*(active|joined)\s*$/i.test(f[iMem] || "")) continue;
    if (iLang >= 0 && f[iLang] && !/^(es|spanish|español|castellano)/i.test(f[iLang].trim())) continue;
    if (iFmt >= 0 && /google/i.test(f[iFmt] || "")) continue; // los de formato Google no se descargan con la API de feeds
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
  // Sin catálogo en Awin: si hay lector de su web (scripts/sync/webs.mjs), se usa con nuestro enlace de Awin
  if (!(prog.feeds || []).length && lectorDe(prog)) {
    yield* productosWeb(prog, max, (destino) => `${enlaceTienda(prog.programa_id)}&ued=${encodeURIComponent(destino)}`);
    return;
  }
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

// Primera foto de verdad: Awin rellena con «noimage.gif» cuando la tienda no le pasa la suya.
const FOTOS = ["merchant_image_url", "large_image", "alternate_image", "aw_image_url", "merchant_thumb_url", "aw_thumb_url"];
export const fotoReal = (p) => FOTOS.map((c) => String(p[c] ?? "").trim()).find((u) => /^https?:\/\//.test(u) && !/noimage|no_image|placeholder/i.test(u)) || null;

export function aProducto(p) {
  const precio = Number(String(p.search_price ?? "").replace(",", "."));
  const antes = Number(String(p.rrp_price ?? "").replace(",", "."));
  if (!p.aw_product_id || !p.product_name || !p.aw_deep_link || !Number.isFinite(precio) || precio <= 0) return null;
  if (p.currency && p.currency !== "EUR") return null;
  return {
    ref: String(p.aw_product_id), titulo: p.product_name, marca: p.brand_name || null,
    precio: Math.round(precio * 100) / 100,
    precio_tachado: Number.isFinite(antes) && antes > precio ? Math.round(antes * 100) / 100 : null,
    moneda: "EUR", imagen: fotoReal(p), url: p.aw_deep_link,
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

// Para elegir a qué tiendas pedir: las de España en las que aún no estamos (lo imprime la sincronización con AWIN_LISTA=1)
export async function sinAdherir(pais = "ES") {
  const r = await fetch(`${API}/publishers/${process.env.AWIN_PUBLISHER_ID}/programmes?relationship=notjoined&countryCode=${pais}&accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`);
  if (!r.ok) throw new Error(`Awin sin adherir: ${r.status}`);
  return (await r.json()).map((p) => ({ id: p.id, nombre: p.name, sector: p.primarySector || "", web: p.displayUrl || "" }));
}

// Solicitudes: pendientes y rechazadas (las aceptadas ya vienen en programas())
export async function solicitudes() {
  const out = [];
  for (const [rel, estado] of [["pending", "pedida"], ["rejected", "rechazada"], ["suspended", "pausada"]]) {
    const r = await fetch(`${API}/publishers/${process.env.AWIN_PUBLISHER_ID}/programmes?relationship=${rel}&accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`);
    if (!r.ok) throw new Error(`Awin ${rel}: ${r.status}`);
    for (const p of await r.json()) out.push({ programa_id: String(p.id), nombre: p.name, web_url: p.displayUrl || null, estado });
  }
  return out;
}

// Comisiones de los últimos `dias` (Awin deja pedir como mucho 31 días por consulta)
export async function comisiones(_tk, dias = 30, ahora = new Date()) {
  const fmt = (d) => d.toISOString().slice(0, 19);
  const desde = new Date(ahora.getTime() - dias * 864e5);
  const r = await fetch(`${API}/publishers/${process.env.AWIN_PUBLISHER_ID}/transactions/?startDate=${fmt(desde)}&endDate=${fmt(ahora)}&timezone=Europe/Madrid&accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`);
  if (!r.ok) throw new Error(`Awin transacciones: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).map(aComision).filter(Boolean);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function aComision(t) {
  if (!t?.id) return null;
  const estado = t.paidToPublisher ? "pagada"
    : { pending: "pendiente", approved: "confirmada", declined: "anulada", deleted: "anulada" }[t.commissionStatus] || "pendiente";
  const ref = t.clickRefs?.clickRef || t.clickRef || null;
  return {
    red: "awin", ref_red: String(t.id), programa_id: String(t.advertiserId),
    clic_id: ref && UUID.test(ref) ? ref : null,
    importe_venta: t.saleAmount?.amount ?? null, comision: Number(t.commissionAmount?.amount) || 0,
    estado, fecha: t.transactionDate,
  };
}

// Promociones y códigos activos de las tiendas en las que estamos (API de promociones de Awin).
export async function promociones() {
  const pub = process.env.AWIN_PUBLISHER_ID, out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`${API}/publisher/${pub}/promotions?accessToken=${encodeURIComponent(process.env.AWIN_TOKEN)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { membership: "joined", status: "active", regionCodes: ["ES"] }, pagination: { page, pageSize: 200 } }),
    });
    if (!r.ok) throw new Error(`Awin promociones: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const lista = j.data || [];
    out.push(...lista.map(aPromocion).filter(Boolean));
    if (lista.length < 200) break;
  }
  return out;
}

export function aPromocion(p) {
  const url = p.urlTracking || p.url;
  if (!p.promotionId || !p.title || !url || !p.advertiser?.id) return null;
  return {
    ref: String(p.promotionId), programa_id: String(p.advertiser.id),
    tipo: /voucher/i.test(p.type || "") || p.voucher?.code ? "codigo" : "oferta",
    titulo: String(p.title).slice(0, 200), descripcion: p.description ? String(p.description).slice(0, 500) : null,
    codigo: p.voucher?.code || null, url, inicio: p.startDate || null, fin: p.endDate || null,
  };
}
