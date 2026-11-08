// Viwai · capturas de la app para los vídeos de funciones (800×1406) y posición de los toques.
// Uso: node cap.js <ruta al prototipo .html> <carpeta de salida>
//   El prototipo se genera con «python3 tools/publicar_prototipo.py <salida.html>» (y sus fotos en img/ junto a él).
// Cada flujo deja f1.jpg, f2.jpg… y en pos.json dónde se toca en cada captura.
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const [, , proto, out = "."] = process.argv;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 703 }, deviceScaleFactor: 2 });
  await p.goto("file://" + path.resolve(proto)); await p.waitForTimeout(1200);
  await p.addStyleTag({ content: ".tabs,.demo{display:none!important}" });
  await p.evaluate(() => { done.luz = 156; done.gas = 108; renderAll(false); }); // como si ya hubiera revisado dos facturas
  const ctr = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round((r.left + r.width / 2) * 2), Math.round((r.top + r.height / 2) * 2)]; }, sel);
  const ir = async (v, sel, off = 120) => { await p.evaluate((v) => { go(v); scrollTo(0, 0); }, v); await p.waitForTimeout(500); if (sel) { await p.evaluate(([s, o]) => { const e = document.querySelector(s); if (e) scrollTo(0, e.getBoundingClientRect().top + scrollY - o); }, [sel, off]); await p.waitForTimeout(350); } };
  const shot = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, n + ".jpg"), type: "jpeg", quality: 92 }); };
  const limpia = () => p.evaluate(() => document.querySelectorAll("#v-facturas *").forEach((e) => { if (e.children.length === 0 && /En el prototipo/.test(e.textContent)) e.style.display = "none"; }));
  const J = {};
  // FACTURAS
  await p.evaluate(() => { done = {}; renderAll(false); });
  await ir("facturas"); J.f1tap = await ctr('[data-type="luz"]'); await shot("f1");
  await p.click('[data-type="luz"]'); await p.waitForTimeout(400); await limpia(); await ir("facturas", "#step-up", 140); J.f2tap = await ctr("#step-up .btn.pri"); await shot("f2");
  await p.evaluate(() => { cur = "luz"; result(); }); await p.waitForTimeout(400); await limpia(); await ir("facturas", "#step-res .hero", 60); J.f3tap = await ctr("#step-res .opt.best .btn.pri"); await shot("f3");
  await p.evaluate(() => { done.luz = 156; done.gas = 108; renderAll(false); });
  // AHORRO (resumen) para el cierre de facturas
  await ir("ahorro"); J.f4tap = await ctr('#ahorro-dash .ad-leg button[data-ak="luz"]'); await shot("f4");
  // MENÚ
  await ir("menu"); J.m1tap = await ctr('[data-mn="semana"]'); await shot("m1");
  await p.click('[data-mn="semana"]'); await p.evaluate(() => scrollTo(0, 0)); J.m2tap = await ctr('[data-mn="compra"]'); await shot("m2");
  await p.click('[data-mn="compra"]'); await p.evaluate(() => scrollTo(0, 0)); await shot("m3");
  // ARMARIO
  await ir("armario"); J.a1tap = await ctr('[data-v="talla"]') || await ctr("#v-armario .btn.pri"); await shot("a1");
  await ir("talla"); await shot("a2");
  await ir("vender"); await shot("a3");
  // GASOLINA
  await ir("gasolina"); J.g1tap = await ctr('[data-fl="60"]'); await shot("g1");
  await p.click('[data-fl="60"]'); await ir("gasolina", "#fuel .card", 150); await shot("g2");
  // CASA AL DÍA (hogar, documentos, mantenimiento)
  await ir("hogar"); J.c1tap = await ctr('#hogar-dash .hd-t[data-v="docs"]'); await shot("c1");
  await ir("docs"); J.c2tap = await ctr('#docs-box .vi .btn'); await shot("c2");
  await ir("mant"); J.c3tap = await ctr('#mant-box .ckb'); await shot("c3");
  // OFERTAS (datos de ejemplo del prototipo)
  await ir("ofertas"); J.o1tap = await ctr('#offers .hr[data-cat="belleza"]'); await ir("ofertas", "#offers .rail", 200); await shot("o1");
  await p.evaluate(() => { cat = "belleza"; renderOffers(); scrollTo(0, 0); }); await p.waitForTimeout(400); J.o2tap = await ctr('[data-oseg="escapadas"]'); await shot("o2");
  await p.click('[data-oseg="escapadas"]'); await p.evaluate(() => scrollTo(0, 0)); await shot("o3");
  await p.click('[data-oseg="compras"]'); await p.evaluate(() => { cat = "para"; renderOffers(); });
  fs.writeFileSync(path.join(out, "pos.json"), JSON.stringify(J)); console.log(JSON.stringify(J)); await b.close();
})();
