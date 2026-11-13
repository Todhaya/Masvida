import test from "node:test";
import assert from "node:assert/strict";
import { leeEurekakids, lectorDe, productosWeb } from "../scripts/sync/webs.mjs";

const ficha = (id, nombre, precio, antes) => `<div class="product-list product-list-02 clearfix "><form data-product='{"id":${id},"name":"${nombre}","brandName":"HAPE","availabilityId":0,"definition":{"price":${antes},"retailPrice":${precio}}}'></form>
  <a class="img" href="/${nombre.toLowerCase().replace(/ /g, "-")}"><img src="/cdnassets/${id}_m.jpg?v=2" alt="" loading="lazy"></a></div>`;

test("Eurekakids: lee nombre, precio rebajado, foto y enlace", () => {
  const html = "<html>" + ficha(1, "Pizarra de madera", 56, 79.99) + ficha(2, "Peluche dragón", 19.99, 19.99) + "</html>";
  const l = leeEurekakids(html);
  assert.equal(l.length, 2);
  assert.deepEqual([l[0].precio, l[0].precio_tachado, l[0].imagen, l[0].destino], [56, 79.99, "https://www.eurekakids.es/cdnassets/1_m.jpg", "https://www.eurekakids.es/pizarra-de-madera"]);
  assert.equal(l[1].precio_tachado, null);
});

test("Lector web: solo para tiendas conocidas, con enlace de afiliación", async () => {
  assert.equal(lectorDe({ nombre: "Petolo" }), null);
  assert.ok(lectorDe({ nombre: "Eurekakids" }));
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => ficha(7, "Puzle mapa", 12, 15) });
  try {
    const out = [];
    for await (const o of productosWeb({ nombre: "Eurekakids" }, 1, (u) => "https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued=" + encodeURIComponent(u))) out.push(o);
    assert.equal(out.length, 1);
    assert.match(out[0].url, /^https:\/\/www\.awin1\.com\/cread\.php\?awinmid=1&awinaffid=2&ued=https%3A%2F%2Fwww\.eurekakids\.es%2Fpuzle-mapa$/);
    assert.equal(out[0].destino, undefined);
  } finally { globalThis.fetch = real; }
});
