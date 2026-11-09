// Viwai · Admitad: programas aprobados del espacio web y sus catálogos de producto (YML).
// Necesita ADMITAD_CLIENT_ID, ADMITAD_CLIENT_SECRET y ADMITAD_WEBSITE_ID (espacio web www.viwai.es).
import { ofertasDeFlujo, textoDeRespuesta } from "./yml.mjs";

const API = "https://api.admitad.com";

export async function token(scope = "advcampaigns_for_website websites") {
  const id = process.env.ADMITAD_CLIENT_ID, secreto = process.env.ADMITAD_CLIENT_SECRET;
  const basic = Buffer.from(`${id}:${secreto}`).toString("base64");
  const r = await fetch(`${API}/token/`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, scope }),
  });
  if (!r.ok) throw new Error(`Admitad token: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

// Programas con conexión activa para nuestro espacio web.
export async function programas(tk, web = process.env.ADMITAD_WEBSITE_ID) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const r = await fetch(`${API}/advcampaigns/website/${web}/?connection_status=active&limit=100&offset=${offset}`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) throw new Error(`Admitad programas: ${r.status} ${await r.text()}`);
    const j = await r.json();
    out.push(...(j.results || []));
    if (!j._meta || offset + 100 >= j._meta.count) break;
  }
  return out.map(aPrograma);
}

export function aPrograma(p) {
  const tipos = (p.traffics || []).filter((t) => t.enabled).map((t) => (t.name || "").toLowerCase());
  return {
    red: "admitad",
    programa_id: String(p.id),
    nombre: p.name,
    web_url: p.site_url || null,
    enlace: p.gotolink || null,
    cashback: tipos.length ? tipos.some((t) => t.includes("cashback")) : null,
    feeds: feedsParaEspana(p.feeds_info || []),
    catalogos: (p.feeds_info || []).map((f) => f.name).filter(Boolean),
  };
}

// Si la tienda tiene catálogos por país, solo los de España (títulos en español); si no, todos.
const ES = /(^|[^a-z])(es|esp|spain|españa|espana|spanish|español)([^a-z]|$)/i;
export function feedsParaEspana(info) {
  const con = info.filter((f) => f.xml_link);
  const es = con.filter((f) => ES.test(f.name || ""));
  return (es.length ? es : con).map((f) => enEuros(f.xml_link));
}

// Admitad convierte los precios del catálogo a la moneda que se le pida (algunas tiendas lo dan en dólares)
export function enEuros(url) {
  try { const u = new URL(url); u.searchParams.set("currency", "EUR"); return u.toString(); } catch { return url; }
}

// Productos del catálogo de un programa (hasta `max`, repartidos entre sus catálogos).
// El enlace del feed ya lleva nuestro seguimiento. Un catálogo que falla no tumba a los demás.
export async function* productos(prog, max) {
  console.log(`   ${prog.nombre}: usa ${prog.feeds.length} de [${(prog.catalogos || []).join(" | ")}]`);
  const porCatalogo = Math.ceil(max / Math.max(1, prog.feeds.length));
  let n = 0, fallos = [];
  for (const feed of prog.feeds) {
    if (n >= max) return;
    let k = 0;
    try {
      const r = await fetch(feed, { signal: AbortSignal.timeout(6 * 60e3) }); // máx. 6 min por catálogo
      if (!r.ok || !r.body) {
        // El motivo viene en el cuerpo (sin la dirección del feed, que lleva nuestro identificador)
        const motivo = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
        throw new Error(`${r.status} ${motivo}`);
      }
      for await (const o of ofertasDeFlujo(textoDeRespuesta(r), Math.min(porCatalogo, max - n))) { n++; k++; yield o; }
    } catch (e) {
      if (k === 0) fallos.push(e.message); // si ya había leído algo, el corte (p. ej. por tiempo) no es un fallo
    }
  }
  if (!n && fallos.length) throw new Error(`Admitad feed ${prog.nombre}: ${fallos[0]}`);
}

// Para elegir a qué tiendas pedir: todos los programas disponibles para el espacio web que venden en España
// y en los que aún no estamos (lo imprime la sincronización con LISTA_REDES=1).
export async function sinConectar(tk, web = process.env.ADMITAD_WEBSITE_ID) {
  const out = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const r = await fetch(`${API}/advcampaigns/website/${web}/?limit=100&offset=${offset}`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) throw new Error(`Admitad lista: ${r.status}`);
    const j = await r.json();
    out.push(...(j.results || []));
    if (!j._meta || offset + 100 >= j._meta.count) break;
  }
  return out
    .filter((p) => p.connection_status !== "active" && (p.regions || []).some((g) => ["ES", "00"].includes(g.region)))
    .map((p) => ({ id: p.id, nombre: p.name, estado: p.connection_status, categorias: (p.categories || []).map((c) => c.name).slice(0, 3).join(", "),
      cashback: (p.traffics || []).some((t) => t.enabled && /cashback/i.test(t.name || "")), web: p.site_url }));
}

// Todos los programas de Admitad que trabajan en España (catálogo general, no solo los del espacio).
export async function catalogoES() {
  const tk = await token("advcampaigns");
  const out = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const r = await fetch(`${API}/advcampaigns/?limit=500&offset=${offset}`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) throw new Error(`Admitad catálogo: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    out.push(...(j.results || []));
    if (!j._meta || offset + 500 >= j._meta.count) break;
  }
  return out
    .filter((p) => (p.regions || []).some((g) => g.region === "ES"))
    .map((p) => ({ id: p.id, nombre: p.name, categorias: (p.categories || []).map((c) => c.name).join(", "),
      cashback: (p.traffics || []).some((t) => t.enabled && /cashback/i.test(t.name || "")), web: p.site_url }));
}

// Solicitudes: programas pendientes o rechazados para nuestro espacio web
export async function solicitudes(tk, web = process.env.ADMITAD_WEBSITE_ID) {
  const out = [];
  for (const [st, estado] of [["pending", "pedida"], ["declined", "rechazada"]]) {
    const r = await fetch(`${API}/advcampaigns/website/${web}/?connection_status=${st}&limit=100`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) throw new Error(`Admitad ${st}: ${r.status}`);
    for (const p of (await r.json()).results || []) out.push({ programa_id: String(p.id), nombre: p.name, web_url: p.site_url || null, estado });
  }
  return out;
}

// Comisiones (acciones) de los últimos `dias`
export async function comisiones(_tk, dias = 30, ahora = new Date(), web = process.env.ADMITAD_WEBSITE_ID) {
  const tk = await token("statistics"); // permiso aparte: si la aplicación no lo tiene, solo fallan las comisiones
  const f = (d) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  const desde = new Date(ahora.getTime() - dias * 864e5);
  const out = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const r = await fetch(`${API}/statistics/actions/?website=${web}&date_start=${f(desde)}&date_end=${f(ahora)}&limit=500&offset=${offset}`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) throw new Error(`Admitad acciones: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    out.push(...(j.results || []).map(aComision).filter(Boolean));
    if (!j._meta || offset + 500 >= j._meta.count) break;
  }
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function aComision(a) {
  if (!a?.action_id) return null;
  const estado = a.paid ? "pagada" : { pending: "pendiente", approved: "confirmada", declined: "anulada", approved_but_stalled: "confirmada" }[a.status] || "pendiente";
  const fecha = a.action_date ? new Date(a.action_date.replace(" ", "T") + "+03:00").toISOString() : new Date().toISOString();
  return {
    red: "admitad", ref_red: String(a.action_id), programa_id: String(a.advcampaign_id),
    clic_id: a.subid && UUID.test(a.subid) ? a.subid : null,
    importe_venta: a.cart != null ? Number(a.cart) : null, comision: Number(a.payment) || 0, estado, fecha,
  };
}
