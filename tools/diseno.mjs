// Viwai · genera los archivos del sistema de diseño y los copia donde se usan.
// Uso: node tools/diseno.mjs [carpeta de iconos de Lucide]
//  - Sin carpeta: solo copia diseno/tokens.css y diseno/iconos.js a app/diseno/ y web/diseno/.
//  - Con carpeta (p. ej. un clon de github.com/lucide-icons/lucide → icons/): regenera diseno/iconos.js
//    con los iconos de diseno/iconos.json.
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lucide = process.argv[2];
if (lucide) {
  const mapa = JSON.parse(fs.readFileSync(path.join(raiz, "diseno/iconos.json"), "utf8"));
  const out = {};
  for (const [es, nombre] of Object.entries(mapa)) {
    if (es.startsWith("_")) continue;
    const f = path.join(lucide, nombre + ".svg");
    if (!fs.existsSync(f)) throw new Error(`No existe el icono de Lucide «${nombre}» (para «${es}»)`);
    const svg = fs.readFileSync(f, "utf8");
    out[es] = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>")).replace(/\s*\n\s*/g, "").trim();
  }
  const js = `// Viwai · iconos (Lucide, licencia ISC: diseno/LUCIDE_LICENSE.txt). Archivo generado por tools/diseno.mjs: no editar a mano.
// Uso: viwaiIcono("facturas") → <svg> listo para pintar. Lista y nombres: diseno/iconos.json y la página /estilo/.
(function () {
  var I = ${JSON.stringify(out)};
  function viwaiIcono(n, clase) {
    var d = I[n];
    if (!d) { if (typeof console !== "undefined") console.warn("Icono desconocido: " + n); d = I.punto; }
    return '<svg class="vw-ico' + (clase ? " " + clase : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  }
  // Rellena <svg data-ico="nombre"></svg> o cualquier elemento con data-ico
  function pintaIconos(raiz) {
    (raiz || document).querySelectorAll("[data-ico]").forEach(function (e) { e.outerHTML = viwaiIcono(e.getAttribute("data-ico"), e.getAttribute("class")); });
  }
  var g = typeof window !== "undefined" ? window : globalThis;
  g.VIWAI_ICONOS = I; g.viwaiIcono = viwaiIcono; g.viwaiPintaIconos = pintaIconos;
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { pintaIconos(); }); else pintaIconos(); }
})();
`;
  fs.writeFileSync(path.join(raiz, "diseno/iconos.js"), js);
  console.log(`diseno/iconos.js: ${Object.keys(out).length} iconos`);
}
for (const destino of ["app/diseno", "web/diseno"]) {
  fs.mkdirSync(path.join(raiz, destino), { recursive: true });
  for (const f of ["tokens.css", "componentes.css", "graficos.css", "iconos.js"]) fs.copyFileSync(path.join(raiz, "diseno", f), path.join(raiz, destino, f));
}
// Lógica compartida entre la web y la app (cada una se publica por separado)
fs.copyFileSync(path.join(raiz, "web/clic.js"), path.join(raiz, "app/js/clic.js"));
console.log("Copiado a app/diseno y web/diseno (y web/clic.js → app/js/clic.js)");
