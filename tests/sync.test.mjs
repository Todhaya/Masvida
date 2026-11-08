import test from "node:test";
import assert from "node:assert/strict";
import { categoriza } from "../scripts/sync/categorias.mjs";
import { ofertasDeFlujo, desescapa } from "../scripts/sync/yml.mjs";
import { slug } from "../scripts/sync/base.mjs";
import { buscaTienda, filaProducto } from "../scripts/sync/sincronizar.mjs";
import { aPrograma } from "../scripts/sync/admitad.mjs";
import { leeAnunciantes, aProducto } from "../scripts/sync/cj.mjs";

test("categorías: secador de pelo y secadora no se confunden", () => {
  assert.equal(categoriza("Secador de pelo iónico 2000W"), "belleza");
  assert.equal(categoriza("Secadora de ropa 8 kg"), "electrodomesticos");
  assert.equal(categoriza("Zapatillas de running"), "deporte");
  assert.equal(categoriza("Pienso para gato 10 kg"), "mascotas");
  assert.equal(categoriza("LEGO Classic caja de ladrillos"), "peques");
  assert.equal(categoriza("Producto raro", "Hogar > Textil > Cojines"), "hogar");
  assert.equal(categoriza("Cosa sin pistas", "", "moda"), "moda");
  assert.equal(categoriza("Cosa sin pistas"), "otros");
});

async function* trozosDe(texto, n = 37) { for (let i = 0; i < texto.length; i += n) yield texto.slice(i, i + n); }
const YML = `<?xml version="1.0"?><yml_catalog><shop><categories>
<category id="1">Belleza</category><category id="2" parentId="1">Pelo &amp; cuidado</category></categories><offers>
<offer id="A1" available="true"><url>https://ad.admitad.com/g/x/?ulp=https%3A%2F%2Fes.aliexpress.com%2Fitem%2F1.html</url><price>25,90</price><oldprice>39.90</oldprice><currencyId>EUR</currencyId><categoryId>2</categoryId><picture>https://img/1.jpg</picture><name><![CDATA[Secador de pelo iónico]]></name><vendor>Xiaomi</vendor></offer>
<offer id="A2" available="false"><url>https://x/2</url><price>10</price><currencyId>EUR</currencyId><name>Agotado</name></offer>
<offer id="A3"><url>https://x/3</url><price>10</price><currencyId>USD</currencyId><name>En dólares</name></offer>
<offer id="A4"><url>https://x/4</url><price>5</price><currencyId>EUR</currencyId><name>Sin categoría</name></offer>
</offers></shop></yml_catalog>`;

test("YML: lee ofertas en trozos, con categorías, CDATA y coma decimal; descarta otras monedas", async () => {
  const out = [];
  for await (const o of ofertasDeFlujo(trozosDe(YML))) out.push(o);
  assert.equal(out.length, 3);
  assert.equal(out[0].titulo, "Secador de pelo iónico");
  assert.equal(out[0].precio, 25.9);
  assert.equal(out[0].precio_tachado, 39.9);
  assert.equal(out[0].categoria_tienda, "Belleza > Pelo & cuidado");
  assert.equal(out[1].disponible, false);
  assert.equal(out[2].categoria_tienda, null);
});

test("YML: respeta el tope de productos", async () => {
  const out = [];
  for await (const o of ofertasDeFlujo(trozosDe(YML), 1)) out.push(o);
  assert.equal(out.length, 1);
});

test("desescapa entidades", () => assert.equal(desescapa("a &amp; b &#241; &#x41;"), "a & b ñ A"));

test("slug quita sufijos de la red", () => {
  assert.equal(slug("Aliexpress WW"), "aliexpress");
  assert.equal(slug("DORMITY ES"), "dormity");
  assert.equal(slug("Vevor Many GEOs"), "vevor");
});

test("buscar tienda: por id de programa o por nombre si aún no tiene", () => {
  const tiendas = [{ id: "aliexpress", nombre: "AliExpress", red_id: "admitad", programa_id: null }, { id: "otra", nombre: "Otra", red_id: "cj", programa_id: "99" }];
  assert.equal(buscaTienda(tiendas, "admitad", { programa_id: "6115", nombre: "Aliexpress WW" }).id, "aliexpress");
  assert.equal(buscaTienda(tiendas, "cj", { programa_id: "99", nombre: "Cambió de nombre" }).id, "otra");
  assert.equal(buscaTienda(tiendas, "cj", { programa_id: "1", nombre: "AliExpress" }), undefined);
});

test("fila de producto: id con tienda, categoría y precio tachado solo si es mayor", () => {
  const f = filaProducto({ id: "aliexpress", categoria: "todo" }, { ref: "A1", titulo: "Secador de pelo", precio: 20, precio_tachado: 15, url: "u", disponible: true }, "t");
  assert.equal(f.id, "aliexpress:A1");
  assert.equal(f.categoria, "belleza");
  assert.equal(f.precio_tachado, null);
});

test("Admitad: cashback según los tipos de tráfico permitidos", () => {
  const p = aPrograma({ id: 6115, name: "Aliexpress WW", traffics: [{ name: "Cashback", enabled: true }, { name: "Incentive", enabled: false }], feeds_info: [{ xml_link: "https://f" }] });
  assert.equal(p.cashback, true);
  assert.deepEqual(p.feeds, ["https://f/?currency=EUR"]);
  assert.equal(aPrograma({ id: 1, name: "X", traffics: [{ name: "Cashback", enabled: false }, { name: "Content", enabled: true }] }).cashback, false);
});

test("CJ: anunciantes aceptados y productos en euros", () => {
  const xml = `<cj-api><advertisers><advertiser><advertiser-id>6181451</advertiser-id><advertiser-name>DORMITY ES</advertiser-name><relationship-status>joined</relationship-status><program-url>https://www.dormity.com</program-url></advertiser><advertiser><advertiser-id>1</advertiser-id><advertiser-name>Otra</advertiser-name><relationship-status>notjoined</relationship-status></advertiser></advertisers></cj-api>`;
  const a = leeAnunciantes(xml);
  assert.equal(a.length, 1);
  assert.equal(a[0].programa_id, "6181451");
  const p = aProducto({ id: "9", title: "Colchón", price: { amount: "400", currency: "EUR" }, salePrice: { amount: "299.5", currency: "EUR" }, linkCode: { clickUrl: "https://c" } });
  assert.equal(p.precio, 299.5);
  assert.equal(p.precio_tachado, 400);
  assert.equal(aProducto({ id: "9", title: "x", price: { amount: "4", currency: "USD" }, linkCode: { clickUrl: "u" } }), null);
});

test("catálogo en otra moneda: para pronto y dice por qué", async () => {
  const { ofertasDeFlujo } = await import("../scripts/sync/yml.mjs");
  const oferta = (i) => `<offer id="${i}"><name>Cosa ${i}</name><url>https://x/${i}</url><price>5</price><currencyId>USD</currencyId></offer>`;
  async function* flujo() { yield "<shop><offers>"; for (let i = 0; i < 50; i++) yield oferta(i); }
  await assert.rejects(async () => { for await (const _ of ofertasDeFlujo(flujo(), 100, 10)); }, /USD×10/);
});

test("los catálogos de Admitad se piden en euros", async () => {
  const { enEuros } = await import("../scripts/sync/admitad.mjs");
  assert.match(enEuros("https://export.admitad.com/x/?user=a&currency=USD&format=xml"), /currency=EUR/);
  assert.doesNotMatch(enEuros("https://export.admitad.com/x/?user=a&currency=USD"), /USD/);
});

test("Admitad: si hay catálogo de España, solo ese", async () => {
  const { feedsParaEspana } = await import("../scripts/sync/admitad.mjs");
  const info = [{ name: "AliExpress WW USD", xml_link: "https://a" }, { name: "AliExpress ES EUR", xml_link: "https://b" }, { name: "Sin enlace" }];
  assert.deepEqual(feedsParaEspana(info), ["https://b/?currency=EUR"]);
  assert.equal(feedsParaEspana([{ name: "Global", xml_link: "https://a" }]).length, 1);
});

test("Admitad: sin catálogo de España, los más vendidos", async () => {
  const { feedsParaEspana } = await import("../scripts/sync/admitad.mjs");
  assert.deepEqual(feedsParaEspana([{ name: "10-25$", xml_link: "https://a" }, { name: "hot products", xml_link: "https://h" }]), ["https://h/?currency=EUR"]);
});

test("primer filtro: fuera recambios, coche y céntimos", async () => {
  const { pasaFiltro } = await import("../scripts/sync/filtro.mjs");
  const img = "https://i/x.jpg";
  assert.equal(pasaFiltro({ titulo: "Interior Rear View Mirror for Audi A4", precio: 12, imagen: img }), false);
  assert.equal(pasaFiltro({ titulo: "Sewing Machine Motor Drive V Belt", precio: 6, imagen: img }), false);
  assert.equal(pasaFiltro({ titulo: "Electric Test Pen", precio: 0.3, imagen: img }), false);
  assert.equal(pasaFiltro({ titulo: "10PCS Hooks", precio: 5, imagen: img }), false);
  assert.equal(pasaFiltro({ titulo: "Portable Blender USB Rechargeable", precio: 14.9, imagen: img }), true);
  assert.equal(pasaFiltro({ titulo: "Portable Blender", precio: 14.9, imagen: null }), false);
});

test("propuestas del escaparate: solo en productos sin revisar", async () => {
  const { aplicaPropuestas } = await import("../scripts/sync/sincronizar.mjs");
  const { writeFile, mkdtemp } = await import("node:fs/promises");
  const dir = await mkdtemp("/tmp/esc-");
  const ruta = dir + "/e.json";
  await writeFile(ruta, JSON.stringify({ productos: [{ id: "ali:1", titulo_es: "Batidora portátil", categoria: "cocina", destacado: true }, { id: "ali:2" }] }));
  const llamadas = [];
  const db = { actualiza: async (t, f, d) => llamadas.push([t, f, d]) };
  assert.equal(await aplicaPropuestas(db, ruta), 1);
  assert.deepEqual(llamadas, [["productos", "id=eq.ali%3A1&curado=is.null", { titulo_es: "Batidora portátil", curado: "propuesto", categoria_fija: "cocina", destacado: true }]]);
});
