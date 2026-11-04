import { test } from "node:test";
import assert from "node:assert/strict";
import { costeLuz, compararLuz } from "../app/js/facturas.js";

// Tarifas de prueba (inventadas, solo para comprobar el cálculo; nunca se muestran a usuarias)
const fija = { id: "t1", nombre: "Fija prueba", verificada: true, potencia_eur_kw_dia: 0.1, energia_eur_kwh: 0.12, iee: 0, iva: 0 };
const horas = { id: "t2", nombre: "Horas prueba", verificada: true, potencia_eur_kw_dia: 0.1, periodos: { punta: 0.2, llano: 0.12, valle: 0.06 }, iee: 0, iva: 0 };
const sinVerificar = { ...fija, id: "t3", verificada: false };
const factura = { importe_total: 90, dias_facturados: 30, potencia_kw: 4, consumo_kwh: 300, consumo_punta_kwh: 60, consumo_llano_kwh: 90, consumo_valle_kwh: 150 };

test("coste con precio único", () => {
  assert.equal(costeLuz(fija, factura), 48); // 4*30*0.1 + 300*0.12
});

test("coste con tres periodos", () => {
  assert.equal(costeLuz(horas, factura), 43.8); // 12 + 60*0.2 + 90*0.12 + 150*0.06
});

test("tarifa sin verificar no se usa", () => {
  assert.equal(costeLuz(sinVerificar, factura), null);
});

test("sin datos en la factura, no hay resultado", () => {
  assert.equal(costeLuz(fija, { ...factura, potencia_kw: null }), null);
  assert.equal(compararLuz([fija], { ...factura, importe_total: null }), null);
  assert.equal(compararLuz([], factura), null);
});

test("ordena por coste y calcula el ahorro", () => {
  const r = compararLuz([fija, horas, sinVerificar], factura);
  assert.equal(r.actualMes, 90);
  assert.deepEqual(r.opciones.map((o) => o.id), ["t2", "t1"]);
  assert.equal(r.mejor.ahorroMes, 46.2);
});
