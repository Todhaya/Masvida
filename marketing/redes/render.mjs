// Genera las imágenes de redes: node marketing/redes/render.mjs
import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
import { fileURLToPath } from "url"; import path from "path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1, viewport: { width: 1800, height: 1500 } });
await p.goto("file://" + path.join(dir, "piezas.html")); await p.waitForTimeout(800);
for (const id of await p.$$eval("body > div[id]", (els) => els.map((e) => e.id))) {
  await (await p.$("#" + id)).screenshot({ path: path.join(dir, "salida", id + ".png") });
}
await b.close(); console.log("ok");
