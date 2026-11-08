// Viwai · sincronización nocturna del catálogo (la lanza GitHub Actions cada madrugada).
// 1. Pregunta a cada red qué tiendas están aprobadas y las da de alta o las actualiza.
// 2. Descarga el catálogo de cada tienda aprobada (con tope) y guarda productos y precios.
// 3. Apunta el resultado en `sincronizaciones` (lo enseña el panel). Si una red falla entera, termina con error
//    y GitHub manda un correo.
// Con DRY_RUN=1 no escribe nada: solo cuenta lo que haría.
import { supabase, slug, trozos } from "./base.mjs";
import { categoriza, categoriaTiendaPorDefecto } from "./categorias.mjs";
import * as admitad from "./admitad.mjs";
import * as cj from "./cj.mjs";

const SECO = !!process.env.DRY_RUN;
const hoy = new Date().toISOString().slice(0, 10);
const limpiaNombre = (n) => String(n).replace(/\s+(WW|ES|EU|INT|Many GEOs?|Global|CPS|CPA)\b.*$/i, "").replace(/\s*\[.*?\]\s*/g, " ").trim();

export function buscaTienda(tiendas, red, prog) {
  return tiendas.find((t) => t.red_id === red && t.programa_id === prog.programa_id)
    || tiendas.find((t) => t.red_id === red && !t.programa_id && slug(t.nombre) === slug(prog.nombre))
    || tiendas.find((t) => t.red_id === red && !t.programa_id && t.id === slug(prog.nombre));
}

export function filaProducto(tienda, o, visto) {
  return {
    id: `${tienda.id}:${o.ref}`.slice(0, 200),
    tienda_id: tienda.id,
    titulo: o.titulo.slice(0, 300),
    marca: o.marca?.slice(0, 80) || null,
    categoria: categoriza(o.titulo, o.categoria_tienda, categoriaTiendaPorDefecto(tienda.categoria)),
    categoria_tienda: o.categoria_tienda?.slice(0, 200) || null,
    precio: o.precio,
    precio_tachado: o.precio_tachado && o.precio_tachado > o.precio ? o.precio_tachado : null,
    imagen: o.imagen || null,
    url: o.url,
    disponible: o.disponible,
    visto,
  };
}

async function sincronizaRed(db, red, mod) {
  const reg = { red, inicio: new Date().toISOString(), tiendas_nuevas: [], productos: 0, ok: true, mensaje: "" };
  const avisos = [];
  try {
    const tk = red === "admitad" ? await admitad.token() : null;
    const progs = await (red === "admitad" ? admitad.programas(tk) : cj.programas());
    const tiendas = await db.todo("tiendas?select=id,nombre,red_id,programa_id,estado,catalogo,max_productos,categoria,cashback");
    const ids = new Set(tiendas.map((t) => t.id));
    const activas = [];
    for (const prog of progs) {
      let t = buscaTienda(tiendas, red, prog);
      if (!t) {
        let id = slug(prog.nombre);
        if (ids.has(id)) id = `${id}-${red}`;
        ids.add(id);
        t = { id, nombre: limpiaNombre(prog.nombre), red_id: red, programa_id: prog.programa_id, web_url: prog.web_url,
          cashback: prog.cashback, estado: "aprobada", alta_auto: true, catalogo: true, max_productos: 3000, categoria: null,
          notas: `Alta automática el ${hoy}. Revisa en su programa si permite mostrar el catálogo y devolver cashback.` };
        if (!SECO) await db.inserta("tiendas", [t]);
        tiendas.push(t);
        reg.tiendas_nuevas.push(t.nombre);
      } else {
        const cambios = { programa_id: prog.programa_id };
        if (t.estado !== "aprobada" && t.estado !== "pausada") cambios.estado = "aprobada";
        if (t.cashback == null && prog.cashback != null) cambios.cashback = prog.cashback;
        if (!SECO) await db.actualiza("tiendas", `id=eq.${encodeURIComponent(t.id)}`, cambios);
        Object.assign(t, cambios);
      }
      activas.push([t, prog]);
    }
    // Tiendas de esta red que ya no están aprobadas
    const vigentes = new Set(progs.map((p) => p.programa_id));
    for (const t of tiendas.filter((t) => t.red_id === red && t.estado === "aprobada" && t.programa_id && !vigentes.has(t.programa_id))) {
      avisos.push(`${t.nombre} ya no aparece aprobada en ${red}: la pauso.`);
      if (!SECO) await db.actualiza("tiendas", `id=eq.${encodeURIComponent(t.id)}`, { estado: "pausada" });
    }
    // Catálogos
    for (const [t, prog] of activas) {
      if (t.estado !== "aprobada" || t.catalogo === false) continue;
      try {
        const n = await sincronizaCatalogo(db, t, mod, prog);
        reg.productos += n;
      } catch (e) { avisos.push(`${t.nombre}: ${e.message}`); }
    }
  } catch (e) {
    reg.ok = false;
    avisos.unshift(e.message);
  }
  reg.fin = new Date().toISOString();
  reg.mensaje = avisos.join("\n").slice(0, 4000) || null;
  if (!SECO) await db.inserta("sincronizaciones", [reg]).catch((e) => console.error("No se pudo guardar el registro:", e.message));
  return reg;
}

async function sincronizaCatalogo(db, t, mod, prog) {
  const max = t.max_productos || 3000;
  const antes = new Map((await db.todo(`productos?select=id,precio&tienda_id=eq.${encodeURIComponent(t.id)}`)).map((p) => [p.id, Number(p.precio)]));
  const visto = new Date().toISOString();
  let lote = [], n = 0;
  const vuelca = async () => {
    if (!lote.length) return;
    const precios = lote.filter((p) => p.precio != null && antes.get(p.id) !== p.precio).map((p) => ({ producto_id: p.id, fecha: hoy, precio: p.precio }));
    if (!SECO) {
      await db.inserta("productos", lote, "id");
      for (const tr of trozos(precios, 500)) await db.inserta("precios", tr, "producto_id,fecha");
    }
    n += lote.length; lote = [];
  };
  const vistos = new Set();
  for await (const o of mod.productos(prog, max)) {
    const fila = filaProducto(t, o, visto);
    if (vistos.has(fila.id)) continue;
    vistos.add(fila.id);
    lote.push(fila);
    if (lote.length >= 500) await vuelca();
  }
  await vuelca();
  if (!SECO) {
    // Lo que lleva dos semanas sin aparecer en el catálogo se borra (libera espacio)
    await db.borra("productos", `tienda_id=eq.${encodeURIComponent(t.id)}&visto=lt.${new Date(Date.now() - 14 * 864e5).toISOString()}`);
    await db.actualiza("tiendas", `id=eq.${encodeURIComponent(t.id)}`, { sincronizada: visto });
  }
  console.log(`  ${t.nombre}: ${n} productos`);
  return n;
}

export async function main() {
  const db = supabase();
  const redes = [];
  if (process.env.ADMITAD_CLIENT_ID) redes.push(["admitad", admitad]);
  if (process.env.CJ_TOKEN) redes.push(["cj", cj]);
  if (!redes.length) { console.log("No hay claves de ninguna red configuradas. Nada que hacer."); return; }
  let fallos = 0;
  for (const [red, mod] of redes) {
    console.log(`== ${red}`);
    const r = await sincronizaRed(db, red, mod);
    console.log(`   ${r.ok ? "bien" : "ERROR"} · ${r.productos} productos · nuevas: ${r.tiendas_nuevas.join(", ") || "ninguna"}`);
    if (r.mensaje) console.log("   " + r.mensaje.replace(/\n/g, "\n   "));
    if (!r.ok) fallos++;
  }
  if (fallos) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
