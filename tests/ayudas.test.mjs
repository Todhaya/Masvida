import test from "node:test";
import assert from "node:assert/strict";
import { ccaaDeCP, perfilAyudas, evalua, misAyudas, nuevas } from "../app/js/ayudas.js";

const familia = perfilAyudas(
  { cp: "08221", edad: 38, ingresos: "medios", vivienda: "alquiler", situacion: ["monoparental"] },
  [{ kid: 0 }, { kid: 1, age: 8 }, { kid: 1, age: 2 }],
);

test("código postal → comunidad", () => {
  assert.equal(ccaaDeCP("08221"), "Cataluña");
  assert.equal(ccaaDeCP("28001"), "Comunidad de Madrid");
  assert.equal(ccaaDeCP("8221"), null);
  assert.equal(ccaaDeCP("99000"), null);
});

test("perfil: hijos y menores de 3 salen de los miembros", () => {
  assert.equal(familia.ccaa, "Cataluña");
  assert.equal(familia.hijos, 2);
  assert.equal(familia.menores3, 1);
  assert.equal(familia.adultos, 1);
});

test("reglas: cumple, no cumple y no sabemos", () => {
  assert.equal(evalua({ menores3_min: 1 }, familia), "si");
  assert.equal(evalua({ ccaa: ["Andalucía"] }, familia), null);
  assert.equal(evalua({ ingresos: ["bajos"] }, familia), null);
  assert.equal(evalua({ ingresos: ["bajos"], comprueba: ["ingresos"] }, familia), "comprueba");
  const sinIngresos = { ...familia, ingresos: null };
  assert.equal(evalua({ ingresos: ["bajos"] }, sinIngresos), "comprueba");
  assert.equal(evalua({ situacion: ["numerosa", "monoparental"], hijos_min: 2 }, familia), "si");
  assert.equal(evalua({}, familia), "si");
});

test("sola, sin hijos: no le salen ayudas por hijos", () => {
  const sola = perfilAyudas({ cp: "41001", edad: 29, ingresos: "bajos", vivienda: "alquiler", situacion: [] }, [{ kid: 0 }]);
  assert.equal(evalua({ hijos_min: 1 }, sola), null);
  assert.equal(evalua({ edad_max: 35, vivienda: ["alquiler"] }, sola), "si");
});

test("lista ordenada y solo las nuevas", () => {
  const ayudas = [
    { id: "a", reglas: { ingresos: ["bajos"], comprueba: ["ingresos"] } },
    { id: "b", reglas: { menores3_min: 1 } },
    { id: "c", reglas: { ccaa: ["Galicia"] } },
  ];
  const l = misAyudas(ayudas, familia);
  assert.deepEqual(l.map((a) => [a.id, a.nivel]), [["b", "si"], ["a", "comprueba"]]);
  assert.deepEqual(nuevas(l, ["b"]).map((a) => a.id), ["a"]);
});
