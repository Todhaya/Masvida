import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
vm.runInThisContext(fs.readFileSync(new URL("../app/js/reclamaciones.js", import.meta.url), "utf8"));
const R = globalThis.viwaiReclama;
const HOY = "2026-11-13";

test("distancias entre aeropuertos (círculo máximo)", () => {
  assert.ok(Math.abs(R.distanciaKm("MAD", "BCN") - 483) < 15);
  assert.ok(Math.abs(R.distanciaKm("MAD", "JFK") - 5770) < 60);
  assert.equal(R.distanciaKm("MAD", "XXX"), null);
});

test("vuelo: importe según distancia", () => {
  const corto = R.vuelo({ origen: "BCN", destino: "LIS", incidencia: "retraso", retraso: "4mas", causa: "tecnica", fecha: "2026-10-01" }, HOY);
  assert.equal(corto.encaja, "si"); assert.equal(corto.importe, 250);
  // Dentro de Europa y más de 1.500 km: 400 aunque pase de 3.500 (Canarias–Helsinki)
  assert.equal(R.vuelo({ origen: "MAD", destino: "LPA", retraso: "3a4" }, HOY).importe, 400);
  assert.equal(R.vuelo({ origen: "LPA", destino: "HEL", retraso: "4mas" }, HOY).importe, 400);
  // Largo radio fuera de Europa: 600, y la mitad entre 3 y 4 h
  assert.equal(R.vuelo({ origen: "MAD", destino: "JFK", retraso: "4mas" }, HOY).importe, 600);
  assert.equal(R.vuelo({ origen: "MAD", destino: "JFK", retraso: "3a4" }, HOY).importe, 300);
});

test("vuelo: cuándo no hay compensación", () => {
  assert.equal(R.vuelo({ origen: "MAD", destino: "BCN", retraso: "menos3" }, HOY).encaja, "no");
  assert.equal(R.vuelo({ origen: "MAD", destino: "BCN", retraso: "4mas", causa: "externa" }, HOY).encaja, "no");
  assert.equal(R.vuelo({ origen: "MAD", destino: "BCN", incidencia: "cancelacion", aviso: "14mas" }, HOY).encaja, "no");
  assert.equal(R.vuelo({ origen: "MAD", destino: "BCN", incidencia: "cancelacion", aviso: "menos7" }, HOY).importe, 250);
  // Sale de fuera de Europa: solo con aerolínea europea
  assert.equal(R.vuelo({ origen: "JFK", destino: "MAD", retraso: "4mas", aerolineaUE: false }, HOY).encaja, "no");
  assert.equal(R.vuelo({ origen: "JFK", destino: "MAD", retraso: "4mas", aerolineaUE: true }, HOY).importe, 600);
  assert.equal(R.vuelo({ origen: "JFK", destino: "MAD", retraso: "4mas" }, HOY).encaja, "comprueba");
  assert.equal(R.vuelo({ origen: "LHR", destino: "JFK", retraso: "4mas" }, HOY).encaja, "no");
});

test("vuelo: plazo de 5 años en España", () => {
  const r = R.vuelo({ origen: "MAD", destino: "BCN", retraso: "4mas", fecha: "2024-03-10" }, HOY);
  assert.equal(r.plazo.hasta, "2029-03-10");
  assert.ok(r.plazo.dias > 0);
});

test("tren: 25 % desde 60 min y 50 % desde 120 min", () => {
  assert.equal(R.tren({ precio: 80, retrasoMin: 45 }).encaja, "no");
  assert.equal(R.tren({ precio: 80, retrasoMin: 75 }).importe, 20);
  assert.equal(R.tren({ precio: 80, retrasoMin: 130 }).importe, 40);
  assert.equal(R.tren({ precio: 12, retrasoMin: 70 }).encaja, "comprueba"); // 3 € < 4 €
});

test("garantía: 3 años desde 2022, 2 antes y 1 en segunda mano", () => {
  const g = R.garantia({ fechaCompra: "2024-05-20" }, HOY);
  assert.equal(g.encaja, "si"); assert.equal(g.hasta, "2027-05-20"); assert.equal(g.anos, 3);
  assert.equal(R.garantia({ fechaCompra: "2021-06-01" }, HOY).encaja, "no");
  assert.equal(R.garantia({ fechaCompra: "2026-03-01", segundaMano: true }, HOY).hasta, "2027-03-01");
  assert.equal(R.garantia({ fechaCompra: "2025-01-10", segundaMano: true }, HOY).encaja, "no");
  assert.match(R.garantia({ fechaCompra: "2025-10-01" }, HOY).notas.join(" "), /venía de fábrica/);
});

test("devolver una compra online: 14 días, o 12 meses más si no te informaron", () => {
  assert.equal(R.desistimiento({ fechaRecibido: "2026-11-05" }, HOY).hasta, "2026-11-19");
  assert.equal(R.desistimiento({ fechaRecibido: "2026-10-01" }, HOY).encaja, "no");
  assert.equal(R.desistimiento({ fechaRecibido: "2026-10-01", informado: false }, HOY).encaja, "si");
});

test("maleta: 7 días si está rota, 21 si llegó tarde", () => {
  assert.equal(R.equipaje({ problema: "danada", fecha: "2026-11-10" }, HOY).hasta, "2026-11-17");
  assert.equal(R.equipaje({ problema: "danada", fecha: "2026-11-01" }, HOY).encaja, "no");
  assert.equal(R.equipaje({ problema: "retrasada", fecha: "2026-11-01" }, HOY).encaja, "si");
});

test("cobro indebido: el aviso de la ley nueva cambia el 28 de diciembre de 2026", () => {
  assert.match(R.cobro({ sector: "banco", importe: 39 }, HOY).notas.join(" "), /Banco de España/);
  assert.match(R.cobro({}, HOY).notas.join(" "), /Desde el 28 de diciembre/);
  assert.match(R.cobro({}, "2027-01-10").notas.join(" "), /tienen 5 días/);
});

test("carta: lleva los datos, la norma y el importe", () => {
  const d = { origen: "BCN", destino: "LIS", incidencia: "retraso", retraso: "4mas", fecha: "2026-10-01", referencia: "TP1033", empresa: "TAP", nombre: "Laura Pérez" };
  const c = R.carta("vuelo", d, R.vuelo(d, HOY));
  assert.match(c, /261\/2004/); assert.match(c, /250 €/); assert.match(c, /TP1033/); assert.match(c, /Laura Pérez/); assert.match(c, /1 de octubre de 2026/);
  for (const t of R.TIPOS) assert.ok(R.carta(t.id, {}, {}).length > 100, t.id);
});

test("seguimiento: avisos, recuperado y en juego", () => {
  assert.match(R.aviso({ estado: "enviada", enviada: "2026-11-01" }, HOY).texto, /18 días/);
  assert.match(R.aviso({ estado: "enviada", enviada: "2026-10-01" }, HOY).texto, /siguiente paso/);
  assert.match(R.aviso({ estado: "borrador", hasta: "2026-11-17" }, HOY).texto, /4 días/);
  const L = [{ estado: "cobrada", importe: 250 }, { estado: "cobrada", importe: 39, cobrado: 30 }, { estado: "enviada", importe: 400 }, { estado: "rechazada", importe: 600 }];
  assert.equal(R.recuperado(L), 280); assert.equal(R.enJuego(L), 400);
});

test("todos los iconos existen en el sistema de diseño", () => {
  const ic = JSON.parse(fs.readFileSync(new URL("../diseno/iconos.json", import.meta.url), "utf8"));
  for (const t of R.TIPOS) assert.ok(ic[t.ic], t.ic);
});
