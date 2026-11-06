// Viwai · /leer-factura — lee una factura (foto o PDF) con Claude y devuelve solo los datos necesarios para comparar.
// La IA solo extrae datos; la comparación de tarifas la hace el código (app/js/facturas.js), no la IA.
// No se guardan ni se devuelven nombre del titular, DNI, dirección ni IBAN.
// Secreto necesario: ANTHROPIC_API_KEY (en los secretos del proyecto de Supabase, nunca en el repositorio).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { encodeBase64 } from "jsr:@std/encoding@1.0.5/base64";

const MODELO = Deno.env.get("MODELO_FACTURAS") ?? "claude-haiku-5-5";
const TIPOS_ARCHIVO = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;

const INSTRUCCIONES = `Eres un lector de facturas domésticas españolas. Extrae SOLO estos campos y responde SOLO con JSON válido:
{"tipo":"luz|gas|fibra|movil|seguro|otra","compania":string|null,"importe_total":number|null,"dias_facturados":number|null,
"potencia_kw":number|null,"consumo_kwh":number|null,"consumo_punta_kwh":number|null,"consumo_llano_kwh":number|null,"consumo_valle_kwh":number|null,
"tarifa":string|null,"permanencia_hasta":"AAAA-MM-DD"|null,"lineas_movil":number|null,"velocidad_fibra_mb":number|null}
Si un dato no aparece claramente en la factura, pon null. No inventes ni estimes. No incluyas nombres, DNI, direcciones, CUPS completo ni cuentas bancarias.`;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
  });
  const { data: u } = await supa.auth.getUser();
  if (!u?.user) return new Response("Inicia sesión para leer facturas.", { status: 401, headers: cors });

  const form = await req.formData();
  const f = form.get("archivo");
  if (!(f instanceof File) || !TIPOS_ARCHIVO.has(f.type)) return new Response("Sube una foto (JPG, PNG) o un PDF.", { status: 400, headers: cors });
  if (f.size > MAX_BYTES) return new Response("El archivo pesa más de 8 MB. Prueba con una foto más ligera.", { status: 400, headers: cors });

  const b64 = encodeBase64(new Uint8Array(await f.arrayBuffer()));
  const bloque = f.type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: f.type, data: b64 } }
    : { type: "image", source: { type: "base64", media_type: f.type, data: b64 } };

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELO, max_tokens: 600, system: INSTRUCCIONES, messages: [{ role: "user", content: [bloque, { type: "text", text: "Extrae los datos." }] }] }),
  });
  if (!r.ok) return new Response("No hemos podido leer la factura ahora. Inténtalo en unos minutos.", { status: 502, headers: cors });
  const out = await r.json();
  const texto = (out.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  let datos;
  try { datos = JSON.parse(texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1)); }
  catch { return new Response("La factura no se ve con claridad. Prueba con otra foto con buena luz.", { status: 422, headers: cors }); }
  return new Response(JSON.stringify(datos), { headers: { ...cors, "content-type": "application/json" } });
});
