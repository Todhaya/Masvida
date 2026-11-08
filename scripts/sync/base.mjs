// Viwai · acceso a Supabase con la clave de servicio (solo en el servidor de GitHub Actions, nunca en la web).
export function supabase(url = process.env.SUPABASE_URL, clave = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!url || !clave) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  const H = { apikey: clave, Authorization: `Bearer ${clave}`, "Content-Type": "application/json" };
  const pide = async (ruta, opciones = {}) => {
    const r = await fetch(`${url}/rest/v1/${ruta}`, { ...opciones, headers: { ...H, ...(opciones.headers || {}) } });
    if (!r.ok) throw new Error(`Supabase ${opciones.method || "GET"} ${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    return r.status === 204 ? null : r.json().catch(() => null);
  };
  return {
    lee: (ruta) => pide(ruta),
    rpc: (fn, args = {}) => pide(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }),
    inserta: (tabla, filas, conflicto) => pide(`${tabla}${conflicto ? `?on_conflict=${conflicto}` : ""}`, {
      method: "POST", body: JSON.stringify(filas),
      headers: { Prefer: `return=minimal${conflicto ? ",resolution=merge-duplicates" : ""}` },
    }),
    borra: (tabla, filtro) => pide(`${tabla}?${filtro}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }),
    actualiza: (tabla, filtro, datos) => pide(`${tabla}?${filtro}`, { method: "PATCH", body: JSON.stringify(datos), headers: { Prefer: "return=minimal" } }),
    // Lee todo paginando (PostgREST devuelve como mucho 1000 filas por defecto)
    async todo(ruta) {
      const out = [];
      for (let desde = 0; ; desde += 1000) {
        const r = await fetch(`${url}/rest/v1/${ruta}`, { headers: { ...H, Range: `${desde}-${desde + 999}` } });
        if (!r.ok) throw new Error(`Supabase GET ${ruta.split("?")[0]}: ${r.status}`);
        const filas = await r.json();
        out.push(...filas);
        if (filas.length < 1000) return out;
      }
    },
  };
}

export const slug = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\b(ww|es|eu|int|many geos?|cps|cpa|cpl|global|spain|españa|espana|\[.*?\]|\(.*?\))\b/g, " ")
  .replace(/[^a-z0-9]+/g, "").slice(0, 40) || "tienda";

export const trozos = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
