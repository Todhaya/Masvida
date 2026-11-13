// Viwai · /avisame — alta en los avisos de ofertas (Black Friday y campañas) con doble confirmación en Brevo.
// POST { email, tiendas: ["amazon", "tous", ...], origen } desde la web. Brevo manda el correo de confirmación;
// solo quien pulsa el enlace entra en la lista (consentimiento demostrable, LSSI art. 21 y RGPD).
// Las tiendas elegidas se guardan como atributo TIENDAS para mandar a cada persona las campañas de sus tiendas.
// Secretos del proyecto (los pone Alba, nunca en el repositorio): BREVO_API_KEY, BREVO_LISTA_ID, BREVO_PLANTILLA_DOI.
const KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const LISTA = Number(Deno.env.get("BREVO_LISTA_ID") ?? 0);
const PLANTILLA = Number(Deno.env.get("BREVO_PLANTILLA_DOI") ?? 0);
const TIENDAS = ["amazon", "ecoflow", "mibro", "tous", "primor", "eurekakids", "juguetesonline", "temu", "aliexpress"];
const ORIGENES = ["https://www.viwai.es", "https://viwai.es", "https://viwai-app.pages.dev"];

const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && (ORIGENES.includes(o) || o.endsWith(".viwai.pages.dev")) ? o : ORIGENES[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
});
const json = (o: string | null, cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors(o), "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const o = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(o) });
  if (req.method !== "POST") return json(o, { error: "metodo" }, 405);
  if (!KEY || !LISTA || !PLANTILLA) return json(o, { error: "no_configurado" }, 503);
  let b: { email?: string; tiendas?: string[]; origen?: string; web?: string; producto?: string; precio?: number };
  try { b = await req.json(); } catch { return json(o, { error: "datos" }, 400); }
  if (b.web) return json(o, { ok: true }); // campo trampa: los robots lo rellenan
  const email = String(b.email ?? "").trim().toLowerCase();
  if (email.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(o, { error: "email" }, 400);
  const tiendas = (Array.isArray(b.tiendas) ? b.tiendas : []).map(String).filter((t) => TIENDAS.includes(t));
  const r = await fetch("https://api.brevo.com/v3/contacts/doubleOptinConfirmation", {
    method: "POST",
    headers: { "api-key": KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email,
      includeListIds: [LISTA],
      templateId: PLANTILLA,
      redirectionUrl: "https://www.viwai.es/black-friday/?confirmado=1",
      attributes: { TIENDAS: tiendas.join(","), ORIGEN: String(b.origen ?? "web").slice(0, 40), CONSENTIMIENTO: new Date().toISOString(),
        ...(b.producto ? { ALERTA_PRODUCTO: String(b.producto).slice(0, 120), ALERTA_PRECIO: Number(b.precio) || null } : {}) },
    }),
  });
  if (!r.ok && r.status !== 204) {
    console.error("brevo", r.status, await r.text());
    return json(o, { error: "envio" }, 502);
  }
  return json(o, { ok: true });
});
