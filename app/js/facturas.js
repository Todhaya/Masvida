// Comparador de tarifas de luz. Lo calcula el código, nunca la IA.
// Las tarifas salen de data/tarifas.json; si una tarifa no tiene precios verificados, no se usa.
// Sin datos suficientes en la factura o sin tarifas verificadas, el comparador no da resultado (null): no se rellena.

const r2 = (x) => Math.round(x * 100) / 100;

// Coste de un periodo con una tarifa. Precios sin impuestos; los impuestos se aplican igual a todas.
export function costeLuz(tarifa, f) {
  if (!tarifa?.verificada) return null;
  const dias = f.dias_facturados, kw = f.potencia_kw;
  if (!(dias > 0) || !(kw > 0)) return null;
  const pot = kw * dias * (tarifa.potencia_eur_kw_dia ?? NaN);
  let energia;
  if (tarifa.energia_eur_kwh != null) {
    if (!(f.consumo_kwh >= 0)) return null;
    energia = f.consumo_kwh * tarifa.energia_eur_kwh;
  } else {
    const p = tarifa.periodos; // { punta, llano, valle } en €/kWh
    if (!p || [f.consumo_punta_kwh, f.consumo_llano_kwh, f.consumo_valle_kwh].some((v) => !(v >= 0))) return null;
    energia = f.consumo_punta_kwh * p.punta + f.consumo_llano_kwh * p.llano + f.consumo_valle_kwh * p.valle;
  }
  const base = pot + energia + (tarifa.cuota_fija_eur_mes ?? 0) * (dias / 30);
  if (!Number.isFinite(base)) return null;
  const impuestos = 1 + (tarifa.iee ?? 0.0511); // impuesto eléctrico
  const iva = 1 + (tarifa.iva ?? 0.21);
  return r2(base * impuestos * iva);
}

// Devuelve las tarifas ordenadas por coste mensual y el ahorro frente a lo que paga ahora.
export function compararLuz(tarifas, factura) {
  const actualMes = factura.importe_total > 0 && factura.dias_facturados > 0
    ? factura.importe_total / factura.dias_facturados * 30 : null;
  if (actualMes == null) return null;
  const filas = (tarifas || [])
    .map((t) => ({ t, coste: costeLuz(t, factura) }))
    .filter((x) => x.coste != null)
    .map(({ t, coste }) => {
      const mes = r2(coste / factura.dias_facturados * 30);
      return { id: t.id, nombre: t.nombre, compania: t.compania, mes, ahorroMes: r2(actualMes - mes) };
    })
    .sort((a, b) => a.mes - b.mes);
  if (!filas.length) return null;
  return { actualMes: r2(actualMes), opciones: filas, mejor: filas[0].ahorroMes > 1 ? filas[0] : null };
}
