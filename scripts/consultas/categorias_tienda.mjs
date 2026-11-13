// Viwai · resumen de las categorías que pone cada tienda a sus productos (para mantener data/mapa_categorias.json).
// Solo lee. Lo lanza el flujo «Consultas» a mano.
import { supabase } from "../sync/base.mjs";
const db = supabase();
const filas = await db.todo("productos?select=tienda_id,categoria_tienda");
const n = new Map();
for (const f of filas) {
  const c = String(f.categoria_tienda ?? "").replace(/^\["?|"?\]$/g, "").replace(/\s*(>|,)\s*/g, " > ").trim() || "(sin categoría)";
  const k = `${f.tienda_id} :: ${c}`;
  n.set(k, (n.get(k) || 0) + 1);
}
for (const [k, v] of [...n].sort((a, b) => b[1] - a[1])) console.log(`CAT ${v} :: ${k}`);
