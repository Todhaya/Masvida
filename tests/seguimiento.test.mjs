import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
vm.runInThisContext(fs.readFileSync(new URL("../app/js/seguimiento.js", import.meta.url), "utf8"));
const d = globalThis.viwaiDetectaEnvio;

test("enlace de seguimiento: reconoce la empresa y el número", () => {
  const r = d("Tu pedido va en camino: https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=PQ4F6P0703673180108001X");
  assert.equal(r.transportista, "correos"); assert.equal(r.numero, "PQ4F6P0703673180108001X");
  assert.equal(d("https://www.ups.com/track?loc=es_ES&tracknum=1Z999AA10123456784").transportista, "ups");
});
test("solo el número: si el formato es de una sola empresa, la reconoce", () => {
  const r = d("1Z999AA10123456784");
  assert.equal(r.transportista, "ups"); assert.match(r.url, /ups\.com/);
  assert.equal(d("TBA123456789012").transportista, "amazon");
  assert.equal(d("RR123456785ES").transportista, "correos");
});
test("número ambiguo: no adivina, propone opciones", () => {
  const r = d("123456789012"); // 12 cifras: GLS, MRW o Nacex
  assert.equal(r.transportista, null); assert.deepEqual(r.posibles.sort(), ["gls", "mrw", "nacex"]);
  assert.match(globalThis.viwaiEnlaceEnvio("mrw", "123456789012"), /mrw\.es.*123456789012/);
});
test("texto sin número: nada", () => assert.equal(d("hola"), null));
