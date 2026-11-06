import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nivelPorAmigas, siguienteNivel, comisionDe, reembolsoDe, saldo, MARGEN_MINIMO } from "../app/js/reembolso.js";

const cat = JSON.parse(readFileSync(new URL("../data/tiendas.json", import.meta.url)));
const T = Object.fromEntries(cat.tiendas.map((t) => [t.id, t]));

test("niveles por amigas", () => {
  assert.equal(nivelPorAmigas(0).nombre, "Ahorras");
  assert.equal(nivelPorAmigas(1).nombre, "Respiras");
  assert.equal(nivelPorAmigas(4).nombre, "Disfrutas");
  assert.equal(nivelPorAmigas(10).nombre, "Viwai");
  assert.equal(nivelPorAmigas(-3).nombre, "Ahorras");
  assert.equal(siguienteNivel(10), null);
  assert.equal(siguienteNivel(3).nombre, "Vives");
});

test("Amazon nunca da reembolso", () => {
  assert.equal(reembolsoDe(T.amazon, 200, 10), 0);
});

test("tiendas sin confirmar no dan reembolso", () => {
  for (const t of cat.tiendas.filter((x) => x.cashback !== true)) assert.equal(reembolsoDe(t, 100, 10), 0, t.id);
});

test("Lidl: como mucho la mitad de la comisión", () => {
  const com = comisionDe(T.lidl, 100); // 5 €
  assert.equal(com, 5);
  assert.ok(reembolsoDe(T.lidl, 100, 10) <= com * 0.5);
  assert.equal(reembolsoDe(T.lidl, 100, 0), 1); // 1 % de 100
});

test("Viwai siempre se queda al menos el margen mínimo", () => {
  for (const t of cat.tiendas.filter((x) => x.cashback === true)) {
    for (const imp of [10, 100, 1000]) {
      const c = comisionDe(t, imp), r = reembolsoDe(t, imp, 50);
      assert.ok(r <= c * (1 - MARGEN_MINIMO) + 0.005, `${t.id} ${imp}`);
    }
  }
});

test("altas de precio fijo: parte de la comisión según nivel", () => {
  assert.equal(reembolsoDe(T.octopus, 0, 0), 3); // 10 % de 30 €
  assert.equal(reembolsoDe(T.octopus, 0, 10), 9); // 30 % de 30 €
});

test("saldo: solo lo confirmado está disponible", () => {
  const s = saldo([
    { tipo: "reembolso", importe: 2.5, estado: "confirmada" },
    { tipo: "reembolso", importe: 1.2, estado: "pendiente" },
    { tipo: "reembolso", importe: 9, estado: "anulada" },
    { tipo: "premio", importe: 3, estado: "confirmada" },
    { tipo: "retirada", importe: 5, estado: "confirmada" },
  ]);
  assert.deepEqual(s, { disponible: 0.5, pendiente: 1.2 });
});
