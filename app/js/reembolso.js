// Cálculo del reembolso (cashback compartido) y de los niveles por invitación.
// Funciones puras: se usan igual en el navegador y en los tests de Node.
//
// Reglas:
// - Solo hay reembolso en tiendas con cashback === true (comprobado en su programa).
//   Si no se sabe (null) o está prohibido (false), el reembolso es 0.
// - La usuaria recibe el % de su nivel sobre el importe, con dos topes:
//   la parte máxima de la comisión que permite la tienda (maxParteUsuaria)
//   y MARGEN_MINIMO, la fracción de la comisión que siempre se queda Masvida.
// - Se paga solo cuando la red confirma la comisión (estado "confirmada").

export const NIVELES = [
  { min: 0, nombre: "Ahorras", pct: 0.01 },
  { min: 1, nombre: "Respiras", pct: 0.015 },
  { min: 3, nombre: "Disfrutas", pct: 0.02 },
  { min: 5, nombre: "Vives", pct: 0.025 },
  { min: 10, nombre: "Masvida", pct: 0.03 },
];

export const MARGEN_MINIMO = 0.3; // Masvida se queda al menos el 30 % de cada comisión
export const PREMIO_INVITACION = 3; // € para cada una, tras la primera acción de la invitada

const redondea = (x) => Math.round(x * 100) / 100;

export function nivelPorAmigas(amigasActivas) {
  const n = Math.max(0, Math.floor(Number(amigasActivas) || 0));
  return NIVELES.reduce((acc, nv) => (n >= nv.min ? nv : acc), NIVELES[0]);
}

export function siguienteNivel(amigasActivas) {
  const n = Math.max(0, Math.floor(Number(amigasActivas) || 0));
  return NIVELES.find((nv) => nv.min > n) || null;
}

// Comisión que paga la tienda por una operación.
export function comisionDe(tienda, importe) {
  if (!tienda || tienda.comision == null) return 0;
  if (tienda.tipo === "cpa") return redondea(tienda.comision);
  return redondea(Math.max(0, Number(importe) || 0) * tienda.comision);
}

// Reembolso para la usuaria por una operación.
export function reembolsoDe(tienda, importe, amigasActivas, comisionReal) {
  if (!tienda || tienda.cashback !== true) return 0;
  const comision = comisionReal != null ? Number(comisionReal) : comisionDe(tienda, importe);
  if (!(comision > 0)) return 0;
  const tope = comision * Math.min(tienda.maxParteUsuaria ?? 0, 1 - MARGEN_MINIMO);
  const porNivel = tienda.tipo === "cpa"
    ? comision * nivelPorAmigas(amigasActivas).pct * 10 // en altas fijas, 10–30 % de la comisión según nivel
    : Math.max(0, Number(importe) || 0) * nivelPorAmigas(amigasActivas).pct;
  return redondea(Math.min(porNivel, tope));
}

// Saldo de la usuaria: solo cuenta lo confirmado por la red y aún no pagado.
export function saldo(movimientos) {
  let disponible = 0, pendiente = 0;
  // movimiento: { tipo: "reembolso" | "premio" | "retirada", importe, estado: "pendiente" | "confirmada" | "anulada" }
  for (const m of movimientos || []) {
    const v = Math.abs(Number(m.importe) || 0);
    if (m.estado === "anulada") continue;
    if (m.tipo === "retirada") { disponible -= v; continue; }
    if (m.estado === "confirmada") disponible += v;
    else if (m.estado === "pendiente") pendiente += v;
  }
  return { disponible: redondea(disponible), pendiente: redondea(pendiente) };
}
