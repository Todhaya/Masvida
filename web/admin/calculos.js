// Viwai · cálculos del panel de administración (funciones puras, probadas en tests/admin.test.mjs).
//
// Cómo se reparte cada euro que pagan las tiendas:
//   comisión confirmada − reembolsos y premios a usuarias = margen
//   margen − gastos de estructura del mes = beneficio
//   beneficio − reserva IRPF − colchón = disponible (lo que puedes considerar tuyo)
// El IVA no entra: si una red te paga IVA aparte, ese dinero es de Hacienda entero.

const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const mesDe = (fecha) => String(fecha || "").slice(0, 7); // "2026-11"

export function gastosDelMes(gastos, ym) {
  return r2((gastos || []).reduce((s, g) => {
    const imp = Number(g.importe) || 0;
    if (g.periodicidad === "mensual") return mesDe(g.fecha) <= ym ? s + imp : s;
    if (g.periodicidad === "anual") return mesDe(g.fecha) <= ym ? s + imp / 12 : s;
    return mesDe(g.fecha) === ym ? s + imp : s;
  }, 0));
}

export function resumenMes({ comisiones = [], movimientos = [], gastos = [] }, ym, reservas = {}) {
  const delMes = (f) => mesDe(f) === ym;
  const com = comisiones.filter((c) => delMes(c.fecha));
  const confirmada = r2(com.filter((c) => c.estado === "confirmada" || c.estado === "pagada").reduce((s, c) => s + Number(c.comision), 0));
  const pendiente = r2(com.filter((c) => c.estado === "pendiente").reduce((s, c) => s + Number(c.comision), 0));
  const aUsuarias = r2(movimientos
    .filter((m) => delMes(m.creado) && (m.tipo === "reembolso" || m.tipo === "premio") && m.estado === "confirmada")
    .reduce((s, m) => s + Number(m.importe), 0));
  const margen = r2(confirmada - aUsuarias);
  const gasto = gastosDelMes(gastos, ym);
  const publicidad = gastosDelMes((gastos || []).filter((g) => g.categoria === "publicidad"), ym);
  const beneficio = r2(margen - gasto);
  const base = Math.max(0, beneficio);
  const irpf = r2(base * (Number(reservas.irpf_pct) || 0) / 100);
  const colchon = r2(base * (Number(reservas.colchon_pct) || 0) / 100);
  const disponible = r2(beneficio - irpf - colchon);
  return { ym, confirmada, pendiente, aUsuarias, margen, gastos: gasto, publicidad, gastosFijos: r2(gasto - publicidad), beneficio, irpf, colchon, disponible };
}

// De cada 100 € de comisión, a dónde va (con los datos del periodo; si no hay, con el reparto mínimo teórico).
export function reparto100(res) {
  if (!res.confirmada) return null;
  const k = 100 / res.confirmada;
  return {
    usuarias: r2(res.aUsuarias * k), gastos: r2(res.gastos * k),
    irpf: r2(res.irpf * k), colchon: r2(res.colchon * k), tuyo: r2(res.disponible * k),
  };
}

export function ultimosMeses(hoy = new Date(), n = 12) {
  const out = [];
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  for (let i = 0; i < n; i++) {
    out.unshift(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}

// Objetivos: marca (pago único con lo acumulado), y los mensuales con la media de los 3 últimos meses cerrados.
export function progresoObjetivos(meses, objetivos = {}) {
  const acumulado = r2(meses.reduce((s, m) => s + Math.max(0, m.disponible), 0));
  const cerrados = meses.slice(-4, -1);
  const media = cerrados.length ? r2(cerrados.reduce((s, m) => s + m.disponible, 0) / cerrados.length) : 0;
  const cuota = Number(objetivos.cuota_autonoma) || 0;
  const item = (clave, nombre, meta, valor, nota) => ({
    clave, nombre, meta: r2(meta), valor: r2(valor),
    falta: r2(Math.max(0, meta - valor)), pct: meta > 0 ? Math.min(100, Math.round(valor / meta * 100)) : 0, nota,
  });
  // Primer objetivo: que lo que queda de las comisiones (después de pagar a las usuarias) cubra los gastos fijos.
  // Cuando se cumple, el excedente se puede reinvertir en publicidad.
  const media3 = (k) => (cerrados.length ? r2(cerrados.reduce((s, m) => s + (Number(m[k]) || 0), 0) / cerrados.length) : 0);
  const margen = media3("margen"), costes = costesMes(media3("gastosFijos"), objetivos);
  const cubrir = item("gastos", "Cubrir todos los gastos y empezar con publicidad", costes, margen,
    "Gastos fijos, cuota de autónoma y marca, frente al margen (comisiones menos reembolsos) de los 3 últimos meses cerrados. Los impuestos se apartan del beneficio");
  if (!(costes > 0)) { cubrir.falta = 0; cubrir.pct = 0; cubrir.pendiente = true; }
  return [
    cubrir,
    item("marca", "Registrar la marca (OEPM)", objetivos.marca_oepm, acumulado, "Pago único con lo acumulado"),
    item("neto", "1.500 € netos al mes", (Number(objetivos.neto_mensual) || 0) + cuota, media, "Ya descontada la cuota de autónoma"),
    item("trabajo", "Poder dejar el trabajo", (Number(objetivos.dejar_trabajo) || 0) + cuota, media, "Ya descontada la cuota de autónoma"),
  ];
}

// Lo que hay que cubrir cada mes: gastos fijos apuntados + cuota de autónoma + marca (registro repartido en 12 meses).
export function costesMes(gastosFijos, objetivos = {}) {
  return r2((Number(gastosFijos) || 0) + (Number(objetivos.cuota_autonoma) || 0) + (Number(objetivos.marca_oepm) || 0) / 12);
}

// Publicidad: solo con el excedente. Presupuesto = % del excedente medio (margen − gastos fijos) de los 3 últimos meses cerrados.
// Coste por casa nueva = publicidad del mes / casas nuevas ese mes. Vuelta = meses que tarda una casa en devolver lo que costó.
// Excedente = margen − (gastos fijos + cuota + marca). De él se apartan antes IRPF y colchón; el presupuesto es un % de lo que queda.
export function publicidad(meses, objetivos = {}, casasNuevas = {}, reservas = {}) {
  const cerrados = meses.slice(-4, -1);
  const n = cerrados.length || 1;
  const excedente = r2(cerrados.reduce((s, m) => s + (Number(m.margen) || 0) - costesMes(m.gastosFijos, objetivos), 0) / n);
  const pct = objetivos.publicidad_pct != null && objetivos.publicidad_pct !== "" ? Number(objetivos.publicidad_pct) : 50;
  const reserva = ((Number(reservas.irpf_pct) || 0) + (Number(reservas.colchon_pct) || 0)) / 100;
  const libre = excedente > 0 ? r2(excedente * Math.max(0, 1 - reserva)) : 0;
  const presupuesto = r2(libre * pct / 100);
  const ultimo = cerrados[cerrados.length - 1] || {};
  const nuevas = Number(casasNuevas[ultimo.ym]) || 0;
  const gastado = Number(ultimo.publicidad) || 0;
  const coste = gastado > 0 && nuevas > 0 ? r2(gastado / nuevas) : null;
  // Margen al mes por casa: margen medio / casas activas aproximadas (las que existían)
  const casasTot = Number(casasNuevas._total) || 0;
  const porCasa = casasTot > 0 ? r2(cerrados.reduce((s, m) => s + (Number(m.margen) || 0), 0) / n / casasTot) : null;
  const vuelta = coste != null && porCasa > 0 ? Math.round(coste / porCasa * 10) / 10 : null;
  return { excedente, libre, pct, presupuesto, puede: excedente > 0, gastado, nuevas, coste, porCasa, vuelta };
}

// KPIs por tienda o por campaña a partir de clics y comisiones.
export function kpis(clics, comisiones) {
  const n = clics.length;
  const validas = comisiones.filter((c) => c.estado !== "anulada");
  const ventas = validas.length;
  const total = r2(validas.reduce((s, c) => s + Number(c.comision), 0));
  return {
    clics: n, ventas, comision: total,
    conversion: n ? Math.round(ventas / n * 1000) / 10 : 0, // %
    epc: n ? r2(total / n) : 0,                            // € por clic
  };
}

// Descuento legal: sobre el precio más bajo de los 30 días anteriores. Sin historial, no se anuncia.
export function descuentoReal(precio, minimo30d) {
  const p = Number(precio), m = Number(minimo30d);
  if (!p || !m || p >= m) return null;
  return Math.round((1 - p / m) * 100);
}

export function estadoCampana(c, hoy = new Date().toISOString().slice(0, 10)) {
  if (c.estado === "borrador") return "borrador";
  if (c.estado === "pausada") return "pausada";
  if (hoy < c.inicio) return "próxima";
  if (hoy > c.fin) return "terminada";
  return "en curso";
}

// CSV de comisiones (exportado de la red): red,ref_red,tienda_id,importe_venta,comision,estado,fecha
export function parseComisionesCSV(texto) {
  const filas = String(texto || "").trim().split(/\r?\n/).filter(Boolean);
  if (!filas.length) return { ok: [], errores: [] };
  const sep = filas[0].includes(";") ? ";" : ",";
  const cab = filas[0].split(sep).map((s) => s.trim().toLowerCase());
  const tieneCab = cab.includes("comision");
  const cols = tieneCab ? cab : ["red", "ref_red", "tienda_id", "importe_venta", "comision", "estado", "fecha"];
  const ok = [], errores = [];
  (tieneCab ? filas.slice(1) : filas).forEach((linea, i) => {
    const v = linea.split(sep).map((s) => s.trim());
    const o = Object.fromEntries(cols.map((c, j) => [c, v[j]]));
    const num = (x) => (x == null || x === "" ? null : Number(String(x).replace(",", ".")));
    const fila = {
      red: o.red, ref_red: o.ref_red, tienda_id: (o.tienda_id || "").toLowerCase(),
      importe_venta: num(o.importe_venta), comision: num(o.comision),
      estado: (o.estado || "pendiente").toLowerCase(), fecha: o.fecha,
    };
    if (!fila.red || !fila.ref_red || !fila.tienda_id || !Number.isFinite(fila.comision) || !fila.fecha
      || !["pendiente", "confirmada", "anulada", "pagada"].includes(fila.estado)) errores.push(i + (tieneCab ? 2 : 1));
    else ok.push(fila);
  });
  return { ok, errores };
}
