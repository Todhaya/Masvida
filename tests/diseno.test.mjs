// Viwai · el sistema de diseño se respeta: copias al día, iconos de la biblioteca y ningún color nuevo suelto.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lee = (f) => fs.readFileSync(path.join(R, f), "utf8");
const ARCHIVOS = ["tokens.css", "componentes.css", "graficos.css", "iconos.js"];
// Dónde se escribe interfaz (app, web, panel)
const todos = (dir, ext) => fs.readdirSync(path.join(R, dir), { recursive: true }).map(String)
  .filter((f) => ext.test(f) && !f.includes("diseno/") && !f.includes("node_modules")).map((f) => path.join(dir, f));
const INTERFAZ = [...todos("web", /\.(html|js|css)$/), "app/index.html", ...todos("app/js", /\.(js|css)$/), "diseno/componentes.css", "diseno/graficos.css"];

test("las copias del sistema de diseño están al día (ejecuta «node tools/diseno.mjs»)", () => {
  for (const d of ["app/diseno", "web/diseno"]) for (const f of ARCHIVOS) assert.equal(lee(`${d}/${f}`), lee(`diseno/${f}`), `${d}/${f} no coincide con diseno/${f}`);
});

test("la app usa la misma lógica de clics que la web", () => assert.equal(lee("app/js/clic.js"), lee("web/clic.js")));

test("todos los iconos que se usan existen en la biblioteca", () => {
  const mapa = JSON.parse(lee("diseno/iconos.json"));
  const js = lee("diseno/iconos.js");
  for (const n of Object.keys(mapa).filter((k) => !k.startsWith("_"))) assert.ok(js.includes(`"${n}":`), `falta «${n}» en iconos.js (regenera con tools/diseno.mjs)`);
  const usados = new Set();
  for (const f of INTERFAZ) for (const m of lee(f).matchAll(/viwaiIcono\("([a-z0-9-]+)"\)|data-ico="([a-z0-9-]+)"/g)) usados.add(m[1] || m[2]);
  const faltan = [...usados].filter((n) => !mapa[n]);
  assert.deepEqual(faltan, [], `iconos sin dar de alta en diseno/iconos.json: ${faltan.join(", ")}`);
});

test("no aparecen colores nuevos fuera del sistema de diseño", () => {
  const norm = (c) => c.toUpperCase();
  const permitidos = new Set([...lee("diseno/tokens.css").matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => norm(m[0])));
  for (const l of lee("diseno/colores_heredados.txt").split("\n")) if (/^#/.test(l.trim())) permitidos.add(norm(l.trim()));
  const nuevos = {};
  for (const f of INTERFAZ) for (const m of lee(f).matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g)) {
    if (!permitidos.has(norm(m[0]))) (nuevos[f] ||= new Set()).add(m[0]);
  }
  const txt = Object.entries(nuevos).map(([f, s]) => `${f}: ${[...s].join(" ")}`).join("\n");
  assert.equal(txt, "", `Colores nuevos: usa una variable de diseno/tokens.css (o añádelo allí si es de verdad un color nuevo de la marca):\n${txt}`);
});
