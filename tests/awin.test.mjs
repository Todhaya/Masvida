import test from "node:test";
import assert from "node:assert/strict";
import { aPrograma, feedsPorTienda, aProducto, leeCSV, filasCSV, urlFeed } from "../scripts/sync/awin.mjs";

test("Awin: tienda aceptada con nuestro enlace", () => {
  process.env.AWIN_PUBLISHER_ID = "3148698";
  const p = aPrograma({ id: 21707, name: "Samsung ES", displayUrl: "https://www.samsung.com/es", primaryRegion: { countryCode: "ES" } });
  assert.equal(p.programa_id, "21707");
  assert.equal(p.enlace, "https://www.awin1.com/cread.php?awinmid=21707&awinaffid=3148698");
  assert.equal(p.pais, "ES");
});

test("Awin: catálogos en español de tiendas aceptadas", () => {
  const csv = 'Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language\n21707,Samsung ES,ES,active,111,"Samsung, todo",es\n21707,Samsung ES,ES,active,112,Samsung EN,en\n999,Otra,ES,not joined,113,Otra,es\n';
  const m = feedsPorTienda(csv);
  assert.deepEqual(m.get("21707"), ["111"]);
  assert.equal(m.has("999"), false);
  assert.match(urlFeed("111", "K"), /apikey\/K\/language\/es\/fid\/111\/columns\/aw_product_id,/);
});

test("Awin: producto del CSV", () => {
  const o = aProducto({ aw_product_id: "5", product_name: "Freidora de aire 5 L", aw_deep_link: "https://www.awin1.com/pclick.php?p=5", search_price: "59.99", rrp_price: "89.99", currency: "EUR", merchant_image_url: "https://i/x.jpg", merchant_category: "Cocina", in_stock: "1" });
  assert.equal(o.precio, 59.99);
  assert.equal(o.precio_tachado, 89.99);
  assert.equal(o.disponible, true);
  assert.equal(aProducto({ aw_product_id: "6", product_name: "x", aw_deep_link: "u", search_price: "10", currency: "GBP" }), null);
});

test("CSV con comillas, comas y trozos partidos", async () => {
  const texto = 'a,b,c\n1,"Hola, ""mundo""",3\n4,5,6\n';
  assert.deepEqual(leeCSV(texto), [["a", "b", "c"], ["1", 'Hola, "mundo"', "3"], ["4", "5", "6"]]);
  async function* trozos() { for (let i = 0; i < texto.length; i += 4) yield texto.slice(i, i + 4); }
  const filas = []; for await (const f of filasCSV(trozos())) filas.push(f);
  assert.deepEqual(filas, [["a", "b", "c"], ["1", 'Hola, "mundo"', "3"], ["4", "5", "6"]]);
});

test("Awin: la lista nueva trae la dirección de descarga de cada catálogo", () => {
  const csv = 'Advertiser ID,Advertiser Name,Membership Status,Feed ID,Language,URL\n21707,Samsung ES,active,111,es,https://ui.awin.com/x/111.csv.gz\n';
  assert.deepEqual(feedsPorTienda(csv).get("21707"), ["https://ui.awin.com/x/111.csv.gz"]);
});

test("Awin y Admitad: comisiones al formato del panel", async () => {
  const { aComision } = await import("../scripts/sync/awin.mjs");
  const c = aComision({ id: 9, advertiserId: 21707, commissionAmount: { amount: 4.2 }, saleAmount: { amount: 120 }, commissionStatus: "approved", transactionDate: "2026-11-27T10:00:00", clickRefs: { clickRef: "0e8f6c1a-1b2c-4d3e-8f90-123456789abc" } });
  assert.deepEqual([c.red, c.ref_red, c.programa_id, c.estado, c.comision, c.clic_id], ["awin", "9", "21707", "confirmada", 4.2, "0e8f6c1a-1b2c-4d3e-8f90-123456789abc"]);
  const ad = (await import("../scripts/sync/admitad.mjs")).aComision({ action_id: 5, advcampaign_id: 6115, payment: "1.50", cart: "30", status: "declined", action_date: "2026-11-27 12:00:00", subid: "x" });
  assert.deepEqual([ad.red, ad.estado, ad.comision, ad.clic_id], ["admitad", "anulada", 1.5, null]);
});
