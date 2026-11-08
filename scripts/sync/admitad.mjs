// Viwai · Admitad: programas aprobados del espacio web y sus catálogos de producto (YML).
// Necesita ADMITAD_CLIENT_ID, ADMITAD_CLIENT_SECRET y ADMITAD_WEBSITE_ID (espacio web www.viwai.es).
import { ofertasDeFlujo, textoDeRespuesta } from "./yml.mjs";

const API = "https://api.admitad.com";

export async function token() {
  const id = process.env.ADMITAD_CLIENT_ID, secreto = process.env.ADMITAD_CLIENT_SECRET;
  const basic = Buffer.from(`${id}:${secreto}`).toString("base64");
  const r = await fetch(`${API}/token/`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, scope: "advcampaigns_for_website websites" }),
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
    feeds: (p.feeds_info || []).map((f) => f.xml_link).filter(Boolean),
  };
}

// Productos del catálogo de un programa (hasta `max`). El enlace del feed ya lleva nuestro seguimiento.
export async function* productos(prog, max) {
  let n = 0;
  for (const feed of prog.feeds) {
    if (n >= max) return;
    const r = await fetch(feed);
    if (!r.ok || !r.body) {
      // El motivo viene en el cuerpo (sin la dirección del feed, que lleva nuestro identificador)
      const motivo = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
      throw new Error(`Admitad feed ${prog.nombre}: ${r.status} ${motivo}`);
    }
    for await (const o of ofertasDeFlujo(textoDeRespuesta(r), max - n)) { n++; yield o; }
  }
}
