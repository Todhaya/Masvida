// Viwai · porcentaje de comisión de cada tienda (el mayor que publica su red), para ordenar el catálogo.
// Solo porcentajes: los pagos fijos por alta («5 €») no se cuentan aquí.
export function maxPct(textos) {
  let max = null;
  for (const t of textos || []) {
    for (const m of String(t ?? "").matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
      const n = Number(m[1].replace(",", "."));
      if (Number.isFinite(n) && n > 0 && n <= 90 && (max == null || n > max)) max = n;
    }
  }
  return max;
}
