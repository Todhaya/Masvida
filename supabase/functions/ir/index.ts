// Masvida · /ir — redirige a una tienda con el enlace de afiliación y apunta el clic.
// Uso: GET /functions/v1/ir?t=<id de tienda>&u=<url de destino opcional, codificada>
// El id del clic viaja a la red como subid (clickref en Awin, epi en Tradedoubler) para atribuir la comisión al hogar.
// Las plantillas de enlace y los ids de afiliada se guardan como secretos del proyecto, nunca en el repositorio:
//   ENLACES_JSON = {"octopus": "https://clk.tradedoubler.com/click?p=XXX&a=YYY&epi={subid}&url={url}", ...}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENLACES: Record<string, string> = JSON.parse(Deno.env.get("ENLACES_JSON") ?? "{}");
const DOMINIOS_PERMITIDOS = (Deno.env.get("DOMINIOS_DESTINO") ?? "").split(",").map((d) => d.trim()).filter(Boolean);

function destinoSeguro(u: string | null): string {
  if (!u) return "";
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return "";
    if (DOMINIOS_PERMITIDOS.length && !DOMINIOS_PERMITIDOS.some((d) => url.hostname === d || url.hostname.endsWith("." + d))) return "";
    return url.toString();
  } catch { return ""; }
}

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams;
  const tienda = (q.get("t") ?? "").toLowerCase();
  const plantilla = ENLACES[tienda];
  if (!plantilla) return new Response("Esta tienda todavía no está disponible.", { status: 404 });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let hogar: string | null = null;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "") || q.get("s");
  if (token) {
    const { data } = await admin.auth.getUser(token);
    if (data?.user) {
      const { data: c } = await admin.from("cuentas").select("hogar_id").eq("user_id", data.user.id).maybeSingle();
      hogar = c?.hogar_id ?? null;
    }
  }
  const { data: clic, error } = await admin.from("clics").insert({ hogar_id: hogar, tienda_id: tienda }).select("id").single();
  const subid = error ? "" : clic.id.replaceAll("-", "");
  const destino = encodeURIComponent(destinoSeguro(q.get("u")));
  const url = plantilla.replace("{subid}", subid).replace("{url}", destino);
  return Response.redirect(url, 302);
});
