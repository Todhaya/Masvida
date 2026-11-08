// Viwai · CJ: anunciantes aceptados y sus productos para España (API GraphQL de productos).
// Necesita CJ_TOKEN (token de acceso personal), CJ_CID (id de la cuenta) y CJ_PID (id del sitio promocional).

const GQL = "https://ads.api.cj.com/query";
const H = () => ({ Authorization: `Bearer ${process.env.CJ_TOKEN}`, "Content-Type": "application/json" });

export async function programas() {
  const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${process.env.CJ_CID}&advertiser-ids=joined&records-per-page=100`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.CJ_TOKEN}` } });
  if (!r.ok) throw new Error(`CJ anunciantes: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return leeAnunciantes(await r.text());
}

export function leeAnunciantes(xml) {
  const tag = (b, n) => (b.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`)) || [])[1]?.trim() ?? null;
  return [...xml.matchAll(/<advertiser>([\s\S]*?)<\/advertiser>/g)].map((m) => ({
    red: "cj",
    programa_id: tag(m[1], "advertiser-id"),
    nombre: tag(m[1], "advertiser-name"),
    web_url: tag(m[1], "program-url"),
    cashback: null,
    relacion: tag(m[1], "relationship-status"),
  })).filter((a) => a.programa_id && (!a.relacion || a.relacion === "joined"));
}

export async function* productos(prog, max) {
  let n = 0;
  for (let offset = 0; n < max; offset += 500) {
    const query = `{ shoppingProducts(companyId: "${process.env.CJ_CID}", partnerIds: ["${prog.programa_id}"], targetCountry: "ES", limit: ${Math.min(500, max - n)}, offset: ${offset}) {
      totalCount count resultList { id title brand price { amount currency } salePrice { amount currency } imageLink productType availability
        linkCode(pid: "${process.env.CJ_PID}") { clickUrl } } } }`;
    const r = await fetch(GQL, { method: "POST", headers: H(), body: JSON.stringify({ query }) });
    if (!r.ok) throw new Error(`CJ productos ${prog.nombre}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    if (j.errors?.length) throw new Error(`CJ productos ${prog.nombre}: ${j.errors[0].message}`);
    const lista = j.data?.shoppingProducts?.resultList || [];
    for (const p of lista) {
      const o = aProducto(p);
      if (o) { n++; yield o; if (n >= max) return; }
    }
    if (lista.length === 0 || offset + lista.length >= (j.data.shoppingProducts.totalCount || 0)) return;
  }
}

export function aProducto(p) {
  const precio = Number(p.salePrice?.amount ?? p.price?.amount);
  const moneda = p.salePrice?.currency || p.price?.currency || "EUR";
  const url = p.linkCode?.clickUrl;
  if (!p.id || !p.title || !url || !Number.isFinite(precio) || moneda !== "EUR") return null;
  return {
    ref: String(p.id), titulo: p.title, marca: p.brand || null,
    precio: Math.round(precio * 100) / 100,
    precio_tachado: p.salePrice?.amount != null && p.price?.amount != null ? Math.round(Number(p.price.amount) * 100) / 100 : null,
    moneda, imagen: p.imageLink || null, url, categoria_tienda: p.productType || null,
    disponible: !p.availability || !/out/i.test(p.availability),
  };
}
