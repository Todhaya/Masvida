import test from "node:test";
import assert from "node:assert/strict";
import {
  gastosDelMes, resumenMes, reparto100, progresoObjetivos, publicidad, kpis, descuentoReal,
  estadoCampana, parseComisionesCSV, ultimosMeses,
} from "../web/admin/calculos.js";

const datos = {
  comisiones: [
    { fecha: "2027-01-10", estado: "confirmada", comision: 100 },
    { fecha: "2027-01-12", estado: "pagada", comision: 50 },
    { fecha: "2027-01-15", estado: "pendiente", comision: 30 },
    { fecha: "2027-01-20", estado: "anulada", comision: 999 },
    { fecha: "2026-12-20", estado: "confirmada", comision: 70 },
  ],
  movimientos: [
    { creado: "2027-01-11", tipo: "reembolso", estado: "confirmada", importe: 20 },
    { creado: "2027-01-11", tipo: "premio", estado: "confirmada", importe: 6 },
    { creado: "2027-01-11", tipo: "reembolso", estado: "pendiente", importe: 9 },
    { creado: "2027-01-11", tipo: "retirada", estado: "confirmada", importe: 15 },
  ],
  gastos: [
    { fecha: "2026-11-06", importe: 24, periodicidad: "anual" },
    { fecha: "2027-01-02", importe: 10, periodicidad: "unico" },
    { fecha: "2027-02-01", importe: 50, periodicidad: "mensual" },
  ],
};

test("gastos del mes: anual prorrateado, únicos solo en su mes, mensuales desde su inicio", () => {
  assert.equal(gastosDelMes(datos.gastos, "2027-01"), 12);
  assert.equal(gastosDelMes(datos.gastos, "2027-02"), 52);
  assert.equal(gastosDelMes(datos.gastos, "2026-10"), 0);
});

test("resumen del mes: solo cuenta lo confirmado y descuenta usuarias, gastos y reservas", () => {
  const r = resumenMes(datos, "2027-01", { irpf_pct: 20, colchon_pct: 10 });
  assert.equal(r.confirmada, 150);
  assert.equal(r.pendiente, 30);
  assert.equal(r.aUsuarias, 26);       // retiradas y pendientes no cuentan
  assert.equal(r.margen, 124);
  assert.equal(r.gastos, 12);
  assert.equal(r.beneficio, 112);
  assert.equal(r.irpf, 22.4);
  assert.equal(r.colchon, 11.2);
  assert.equal(r.disponible, 78.4);
  const p = reparto100(r);
  assert.equal(Math.round(p.usuarias + p.gastos + p.irpf + p.colchon + p.tuyo), 100);
});

test("con pérdidas no se reserva IRPF", () => {
  const r = resumenMes({ comisiones: [], movimientos: [], gastos: [{ fecha: "2027-01-01", importe: 30 }] }, "2027-01", { irpf_pct: 20 });
  assert.equal(r.irpf, 0);
  assert.equal(r.disponible, -30);
  assert.equal(reparto100(r), null);
});

test("objetivos: marca con lo acumulado, mensuales con la media de los 3 meses cerrados", () => {
  const meses = [100, 200, 300, 400, 999].map((d) => ({ disponible: d }));
  const o = progresoObjetivos(meses, { marca_oepm: 150, cuota_autonoma: 300, neto_mensual: 1500, dejar_trabajo: 4000 });
  const marca = o.find((x) => x.clave === "marca");
  assert.equal(marca.pct, 100);
  const cuota = o.find((x) => x.clave === "autonoma");
  assert.equal(cuota.valor, 300);      // media de 200, 300, 400 (el mes en curso no cuenta)
  assert.equal(cuota.falta, 0);
  assert.equal(o.find((x) => x.clave === "neto").meta, 1800);
});

test("kpis: conversión y euros por clic sin contar anuladas", () => {
  const k = kpis([1, 2, 3, 4], [{ estado: "confirmada", comision: 4 }, { estado: "anulada", comision: 100 }]);
  assert.deepEqual(k, { clics: 4, ventas: 1, comision: 4, conversion: 25, epc: 1 });
  assert.equal(kpis([], []).epc, 0);
});

test("descuento real sobre el mínimo de 30 días", () => {
  assert.equal(descuentoReal(75, 100), 25);
  assert.equal(descuentoReal(100, 100), null);
  assert.equal(descuentoReal(80, null), null);
});

test("estado de campaña", () => {
  const c = { estado: "programada", inicio: "2026-11-20", fin: "2026-11-30" };
  assert.equal(estadoCampana(c, "2026-11-25"), "en curso");
  assert.equal(estadoCampana(c, "2026-11-01"), "próxima");
  assert.equal(estadoCampana(c, "2026-12-01"), "terminada");
  assert.equal(estadoCampana({ ...c, estado: "borrador" }, "2026-11-25"), "borrador");
});

test("CSV de comisiones: con cabecera, coma decimal y filas erróneas", () => {
  const { ok, errores } = parseComisionesCSV(
    "red;ref_red;tienda_id;importe_venta;comision;estado;fecha\nawin;1;Zalando;50,5;3,03;confirmada;2026-11-27\nawin;2;;;1;pendiente;2026-11-27\n");
  assert.equal(ok.length, 1);
  assert.equal(ok[0].comision, 3.03);
  assert.equal(ok[0].tienda_id, "zalando");
  assert.deepEqual(errores, [3]);
});

test("últimos meses en orden", () => {
  assert.deepEqual(ultimosMeses(new Date("2027-02-15T00:00:00Z"), 3), ["2026-12", "2027-01", "2027-02"]);
});

test("publicidad: se separa de los gastos fijos y solo se invierte el excedente", () => {
  const gastos = [{ fecha: "2027-01-01", importe: 20, periodicidad: "mensual", categoria: "herramientas" }, { fecha: "2027-01-10", importe: 50, categoria: "publicidad" }];
  const r = resumenMes({ comisiones: [{ fecha: "2027-01-05", estado: "confirmada", comision: 200 }], movimientos: [], gastos }, "2027-01", {});
  assert.equal(r.publicidad, 50); assert.equal(r.gastosFijos, 20); assert.equal(r.gastos, 70);
  const meses = [{ ym: "a", margen: 120, gastosFijos: 20 }, { ym: "b", margen: 120, gastosFijos: 20 }, { ym: "c", margen: 120, gastosFijos: 20, publicidad: 40 }, { ym: "d" }];
  const p = publicidad(meses, { publicidad_pct: 50 }, { c: 4, _total: 10 });
  assert.equal(p.excedente, 100); assert.equal(p.presupuesto, 50); assert.equal(p.coste, 10);
  assert.equal(p.porCasa, 12); assert.equal(p.vuelta, 0.8);
  assert.equal(publicidad([{ margen: 10, gastosFijos: 30 }, {}], {}).presupuesto, 0);
});

test("objetivo cubrir gastos: margen frente a gastos fijos; sin gastos apuntados queda pendiente", () => {
  const o = progresoObjetivos([{ margen: 50, gastosFijos: 100 }, { margen: 50, gastosFijos: 100 }, { margen: 50, gastosFijos: 100 }, {}], {});
  const g = o.find((x) => x.clave === "gastos");
  assert.equal(g.pct, 50); assert.equal(g.falta, 50);
  assert.equal(progresoObjetivos([{}, {}], {}).find((x) => x.clave === "gastos").pendiente, true);
});
