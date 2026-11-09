import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ctx = { self: {} }; ctx.self.self = ctx.self;
vm.runInNewContext(fs.readFileSync("app/vendor/qrcode.js", "utf8") + ";self.qrcode=qrcode;", ctx);
vm.runInNewContext(fs.readFileSync("app/js/codigos.js", "utf8"), ctx);
const svg = ctx.self.viwaiCodigoSVG;
const anchoModulos = (s) => +s.match(/viewBox="0 0 (\d+)/)[1] - 20;

test("Wallet: EAN-13 y EAN-8 con su ancho estándar (95 y 67 módulos)", () => {
  assert.equal(anchoModulos(svg("8412345678905", "EAN_13")), 95);
  assert.equal(anchoModulos(svg("84123459", "")), 67);
});
test("Wallet: un número tecleado con dígito de control incorrecto no se «corrige»: va en Code 128", () => {
  const s = svg("2210778100421", "");
  assert.equal(anchoModulos(s), 11 * (1 + 13 + 1) + 13);
});
test("Wallet: QR para entradas y tarjetas con QR", () => {
  assert.match(svg("https://viwai.es/e/ABC", "QR_CODE"), /<svg class="cod qr"/);
});
